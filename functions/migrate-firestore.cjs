"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { once } = require("node:events");
const { createHash } = require("node:crypto");
const { cert, initializeApp } = require("firebase-admin/app");
const { FieldPath, GeoPoint, Timestamp, getFirestore } = require("firebase-admin/firestore");

const BATCH_SIZE = 400;

function readServiceAccount(filePath) {
  const absolutePath = path.resolve(filePath);
  const account = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error(`Invalid service-account file: ${absolutePath}`);
  }
  return account;
}

function encode(value) {
  if (value instanceof Timestamp) return { __zpassType: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof Date) return { __zpassType: "date", value: value.toISOString() };
  if (value instanceof GeoPoint) return { __zpassType: "geoPoint", latitude: value.latitude, longitude: value.longitude };
  if (Buffer.isBuffer(value)) return { __zpassType: "bytes", value: value.toString("base64") };
  if (value && typeof value.path === "string" && typeof value.firestore === "object") {
    return { __zpassType: "reference", path: value.path };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { __zpassType: "number", value: String(value) };
  }
  return value;
}

function decode(value, db) {
  if (Array.isArray(value)) return value.map((item) => decode(item, db));
  if (value && typeof value === "object") {
    if (value.__zpassType === "timestamp") return new Timestamp(value.seconds, value.nanoseconds);
    if (value.__zpassType === "date") return new Date(value.value);
    if (value.__zpassType === "geoPoint") return new GeoPoint(value.latitude, value.longitude);
    if (value.__zpassType === "bytes") return Buffer.from(value.value, "base64");
    if (value.__zpassType === "reference") return db.doc(value.path);
    if (value.__zpassType === "number") return Number(value.value);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item, db)]));
  }
  return value;
}

async function writeLine(stream, line) {
  if (!stream.write(`${JSON.stringify(line)}\n`)) await once(stream, "drain");
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function visitCollection(collection, stream, stats) {
  let cursor = null;
  while (true) {
    let query = collection.orderBy(FieldPath.documentId()).limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) return;
    for (const document of snapshot.docs) {
      await writeLine(stream, { path: document.ref.path, data: encode(document.data()) });
      stats.documents += 1;
      if (stats.documents % 1000 === 0) console.log(`Backed up ${stats.documents} Firestore documents.`);
      const childCollections = await document.ref.listCollections();
      for (const child of childCollections) await visitCollection(child, stream, stats);
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < BATCH_SIZE) return;
  }
}

async function countDocuments(db) {
  const stats = { documents: 0 };
  const sink = { write: () => true };
  for (const collection of await db.listCollections()) await visitCollection(collection, sink, stats);
  return stats.documents;
}

async function backup(sourceServiceAccountPath, destinationDirectory) {
  const sourceAccount = readServiceAccount(sourceServiceAccountPath);
  if (sourceAccount.project_id !== "tomsss") throw new Error("Source service account must belong to tomsss.");
  const outputDirectory = path.resolve(destinationDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "firestore-tomsss.ndjson");
  if (fs.existsSync(outputPath)) throw new Error(`Backup already exists; refusing to overwrite ${outputPath}`);

  const app = initializeApp({ credential: cert(sourceAccount), projectId: sourceAccount.project_id }, "zpass-migration-source");
  const db = getFirestore(app);
  const stream = fs.createWriteStream(outputPath, { flags: "wx", encoding: "utf8" });
  const stats = { documents: 0 };
  try {
    for (const collection of await db.listCollections()) await visitCollection(collection, stream, stats);
    await new Promise((resolve, reject) => {
      stream.once("error", reject);
      stream.end(resolve);
    });
  } catch (error) {
    stream.destroy();
    throw error;
  }
  const hash = await hashFile(outputPath);
  const manifestPath = path.join(outputDirectory, "firestore-tomsss.manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    sourceProject: sourceAccount.project_id,
    sourceDatabase: "(default)",
    documents: stats.documents,
    sha256: hash,
    createdAt: new Date().toISOString(),
  }, null, 2), { flag: "wx" });
  console.log(`Firestore backup complete: ${stats.documents} documents; SHA-256 ${hash}.`);
}

async function restore(destinationServiceAccountPath, backupPath) {
  const destinationAccount = readServiceAccount(destinationServiceAccountPath);
  if (destinationAccount.project_id !== "zpasss") throw new Error("Destination service account must belong to zpasss.");
  const absoluteBackup = path.resolve(backupPath);
  const manifestPath = absoluteBackup.replace(/\.ndjson$/i, ".manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const backupHash = await hashFile(absoluteBackup);
  if (manifest.sourceProject !== "tomsss" || manifest.sha256 !== backupHash) {
    throw new Error("Firestore backup manifest/hash validation failed.");
  }

  const app = initializeApp({ credential: cert(destinationAccount), projectId: destinationAccount.project_id }, "zpass-migration-destination");
  const db = getFirestore(app);
  if ((await db.listCollections()).length > 0) {
    throw new Error("Destination Firestore is not empty; refusing to overwrite existing collections.");
  }

  const input = readline.createInterface({ input: fs.createReadStream(absoluteBackup), crlfDelay: Infinity });
  let batch = db.batch();
  let writes = 0;
  let imported = 0;
  for await (const line of input) {
    if (!line) continue;
    const document = JSON.parse(line);
    if (!document.path || !document.data || typeof document.data !== "object") {
      throw new Error("Invalid Firestore backup document.");
    }
    batch.set(db.doc(document.path), decode(document.data, db));
    writes += 1;
    imported += 1;
    if (writes >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
      if (imported % 1000 === 0) console.log(`Restored ${imported} Firestore documents.`);
    }
  }
  if (writes) await batch.commit();
  const destinationCount = await countDocuments(db);
  if (destinationCount !== manifest.documents || imported !== manifest.documents) {
    throw new Error(`Firestore restore verification mismatch: backup=${manifest.documents}, imported=${imported}, destination=${destinationCount}.`);
  }
  console.log(`Firestore restore verified: ${destinationCount} documents in project zpasss.`);
}

async function main() {
  const [mode, credentialPath, targetPath] = process.argv.slice(2);
  if (!mode || !credentialPath || !targetPath || !["backup", "restore"].includes(mode)) {
    throw new Error([
      "Usage:",
      "  node functions/migrate-firestore.cjs backup <tomsss-service-account.json> <private-backup-folder>",
      "  node functions/migrate-firestore.cjs restore <zpasss-service-account.json> <firestore-tomsss.ndjson>",
    ].join("\n"));
  }
  if (mode === "backup") await backup(credentialPath, targetPath);
  else await restore(credentialPath, targetPath);
}

main().catch((error) => {
  console.error(`Firestore migration ${process.argv[2] || "operation"} failed: ${error.message}`);
  process.exitCode = 1;
});
