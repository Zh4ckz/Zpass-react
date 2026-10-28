import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "zh4ckz@proton.me";

import {firebaseConfig} from "./firebase-config.mjs";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

// ---------- Auth ----------

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("authMessage").textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    $("authMessage").textContent = error.message;
  }
});

$("googleLogin").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    $("authMessage").textContent = error.message;
  }
});

$("signOut").addEventListener("click", () => signOut(auth));
$("signOutDenied").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  const isAdmin = !!user && user.email === ADMIN_EMAIL;
  $("adminApp").classList.toggle("hidden", !isAdmin);
  $("authGate").classList.toggle("hidden", isAdmin);
  $("deniedMessage").classList.toggle("hidden", !(user && !isAdmin));
  $("loginForm").classList.toggle("hidden", !!user);
  $("googleLogin").classList.toggle("hidden", !!user);

  if (isAdmin) {
    $("whoAmI").textContent = user.email;
    refreshAll();
  }
});

function refreshAll() {
  loadUpdates();
  loadCrypto();
  loadPaypal();
  loadChanges();
  loadActive();
  loadUsers();
  loadPayments();
}

// ---------- Helpers ----------

function monthsFromNow(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + Number(months));
  return Timestamp.fromDate(date);
}

function fmtDate(ts) {
  if (!ts || !ts.toDate) return "—";
  return ts.toDate().toLocaleString();
}

async function findUidByZPassId(zPassId) {
  const snap = await getDocs(query(collection(db, "users"), where("zPassId", "==", zPassId), limit(1)));
  if (snap.empty) return null;
  return snap.docs[0].id;
}

function pill(text, cls) {
  return `<span class="pill ${cls}">${text}</span>`;
}

function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "approved" || s === "active") return "active";
  if (s === "rejected" || s === "revoked" || s === "cancelled") return "rejected";
  return "free";
}

// ---------- Crypto payment requests ----------

$("cryptoRefresh").addEventListener("click", loadCrypto);
$("cryptoStatusFilter").addEventListener("change", loadCrypto);

async function loadCrypto() {
  const status = $("cryptoStatusFilter").value;
  const tbody = document.querySelector("#cryptoTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(query(
    collection(db, "crypto_payment_requests"),
    where("status", "==", status),
    orderBy("createdAt", "desc"),
    limit(25)
  ));
  $("cryptoEmpty").classList.toggle("hidden", !snap.empty);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    const actions = status === "PENDING"
      ? `<button class="approve" data-action="approve" data-id="${docSnap.id}">Approve</button>
         <button class="reject" data-action="reject" data-id="${docSnap.id}">Reject</button>`
      : "";
    tr.innerHTML = `
      <td class="mono">${data.zPassId || ""}</td>
      <td>${data.plan || ""}</td>
      <td>$${data.amountUsd ?? ""}</td>
      <td>${data.network || ""} (${data.symbol || ""})</td>
      <td class="mono">${(data.txId || "").slice(0, 18)}${(data.txId || "").length > 18 ? "…" : ""}</td>
      <td>${pill(data.status, statusClass(data.status))}</td>
      <td><div class="row-actions">${actions}</div></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const docData = snap.docs.find((d) => d.id === id)?.data();
      if (!docData) return;
      if (btn.dataset.action === "approve") approveCrypto(id, docData);
      else rejectCrypto(id);
    });
  });
}

async function approveCrypto(requestId, data) {
  const defaultMonths = data.plan === "Yearly" ? 12 : 1;
  const tier = (prompt("Tier to grant (PLUS or PRO):", "PLUS") || "").trim().toUpperCase();
  if (!["PLUS", "PRO"].includes(tier)) return;
  const monthsRaw = prompt("Duration in months:", String(defaultMonths));
  const months = parseInt(monthsRaw, 10);
  if (!months || months < 1) return;

  await setDoc(doc(db, "subscriptions", data.uid), {
    zPassId: data.zPassId,
    plan: tier,
    planId: `zpass_${tier.toLowerCase()}_manual`,
    status: "ACTIVE",
    expiresAt: monthsFromNow(months),
    lastPaymentRequestId: requestId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await updateDoc(doc(db, "crypto_payment_requests", requestId), {
    status: "APPROVED",
    approvedAt: serverTimestamp(),
    approvedBy: auth.currentUser.email
  });

  loadCrypto();
  loadActive();
}

async function rejectCrypto(requestId) {
  const reason = prompt("Rejection reason (optional):", "") || "";
  await updateDoc(doc(db, "crypto_payment_requests", requestId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp(),
    rejectedBy: auth.currentUser.email,
    rejectionReason: reason
  });
  loadCrypto();
}

// ---------- Card / Google Pay / PayPal requests ----------

$("paypalRefresh").addEventListener("click", loadPaypal);
$("paypalStatusFilter").addEventListener("change", loadPaypal);

async function loadPaypal() {
  const status = $("paypalStatusFilter").value;
  const tbody = document.querySelector("#paypalTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(query(
    collection(db, "paypal_payment_requests"),
    where("status", "==", status),
    orderBy("createdAt", "desc"),
    limit(25)
  ));
  $("paypalEmpty").classList.toggle("hidden", !snap.empty);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    const actions = status === "PENDING"
      ? `<button class="approve" data-action="approve" data-id="${docSnap.id}">Approve</button>
         <button class="reject" data-action="reject" data-id="${docSnap.id}">Reject</button>`
      : "";
    tr.innerHTML = `
      <td class="mono">${data.zPassId || ""}</td>
      <td>${data.tier || ""}</td>
      <td>${data.billing || ""}</td>
      <td>$${data.amountUsd ?? ""}</td>
      <td>${data.method || ""}</td>
      <td class="mono">${data.orderId || ""}</td>
      <td>${pill(data.status, statusClass(data.status))}</td>
      <td><div class="row-actions">${actions}</div></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const docData = snap.docs.find((d) => d.id === id)?.data();
      if (!docData) return;
      if (btn.dataset.action === "approve") approvePaypal(id, docData);
      else rejectPaypal(id);
    });
  });
}

async function approvePaypal(requestId, data) {
  const defaultMonths = data.billing === "YEARLY" ? 12 : 1;
  const monthsRaw = prompt(`Duration in months for ${data.tier}:`, String(defaultMonths));
  const months = parseInt(monthsRaw, 10);
  if (!months || months < 1) return;

  await setDoc(doc(db, "subscriptions", data.uid), {
    zPassId: data.zPassId,
    plan: data.tier,
    status: "ACTIVE",
    expiresAt: monthsFromNow(months),
    lastPaymentRequestId: requestId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await updateDoc(doc(db, "paypal_payment_requests", requestId), {
    status: "APPROVED",
    approvedAt: serverTimestamp(),
    approvedBy: auth.currentUser.email
  });

  loadPaypal();
  loadActive();
}

async function rejectPaypal(requestId) {
  const reason = prompt("Rejection reason (optional):", "") || "";
  await updateDoc(doc(db, "paypal_payment_requests", requestId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp(),
    rejectedBy: auth.currentUser.email,
    rejectionReason: reason
  });
  loadPaypal();
}

// ---------- Subscription change requests ----------

$("changeRefresh").addEventListener("click", loadChanges);
$("changeStatusFilter").addEventListener("change", loadChanges);

async function loadChanges() {
  const status = $("changeStatusFilter").value;
  const tbody = document.querySelector("#changeTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(query(
    collection(db, "subscription_change_requests"),
    where("status", "==", status),
    orderBy("createdAt", "desc"),
    limit(25)
  ));
  $("changeEmpty").classList.toggle("hidden", !snap.empty);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    const planOrTarget = data.type === "CHANGE_PLAN"
      ? `${data.plan || ""} (${data.billing || ""})`
      : (data.target || "—");
    const actions = status === "PENDING"
      ? `<button class="approve" data-action="approve" data-id="${docSnap.id}">Approve</button>
         <button class="reject" data-action="reject" data-id="${docSnap.id}">Reject</button>`
      : "";
    tr.innerHTML = `
      <td class="mono">${data.ownerZpId || ""}</td>
      <td>${data.type || ""}</td>
      <td>${planOrTarget}</td>
      <td>${pill(data.status, statusClass(data.status))}</td>
      <td><div class="row-actions">${actions}</div></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const docData = snap.docs.find((d) => d.id === id)?.data();
      if (!docData) return;
      if (btn.dataset.action === "approve") approveChange(id, docData);
      else rejectChange(id);
    });
  });
}

async function approveChange(requestId, data) {
  const subRef = doc(db, "subscriptions", data.ownerUid);

  if (data.type === "CHANGE_PLAN") {
    const months = data.billing === "Yearly" ? 12 : 1;
    const tier = data.plan === "FAMILY" ? "PRO" : data.plan === "INDIVIDUAL" ? "PLUS" : String(data.plan).toUpperCase();
    if (!["PLUS", "PRO"].includes(tier)) throw new Error("Choose Plus or Pro for this account.");
    await setDoc(subRef, {
      zPassId: data.ownerZpId,
      plan: tier,
      planId: `zpass_${tier.toLowerCase()}_manual`,
      status: "ACTIVE",
      expiresAt: monthsFromNow(months),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } else if (data.type === "CANCEL") {
    await setDoc(subRef, {
      status: "CANCELLED",
      expiresAt: Timestamp.now(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } else if (data.type === "ADD_FAMILY_MEMBER" || data.type === "REMOVE_FAMILY_MEMBER") {
    await setDoc(subRef, {
      familyMembers: data.type === "ADD_FAMILY_MEMBER" ? arrayUnion(data.target) : arrayRemove(data.target),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  await updateDoc(doc(db, "subscription_change_requests", requestId), {
    status: "APPROVED",
    approvedAt: serverTimestamp(),
    approvedBy: auth.currentUser.email
  });

  loadChanges();
  loadActive();
}

async function rejectChange(requestId) {
  const reason = prompt("Rejection reason (optional):", "") || "";
  await updateDoc(doc(db, "subscription_change_requests", requestId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp(),
    rejectedBy: auth.currentUser.email,
    rejectionReason: reason
  });
  loadChanges();
}

// ---------- Direct subscription management ----------

$("manageLookup").addEventListener("click", async () => {
  const zPassId = $("manageZpId").value.trim();
  const statusEl = $("manageStatus");
  statusEl.className = "status-line";
  statusEl.textContent = "Looking up…";
  try {
    const uid = await findUidByZPassId(zPassId);
    if (!uid) {
      statusEl.className = "status-line err";
      statusEl.textContent = "No user found with that zPassId.";
      return;
    }
    const subSnap = await getDoc(doc(db, "subscriptions", uid));
    if (!subSnap.exists()) {
      statusEl.className = "status-line";
      statusEl.textContent = `${zPassId} → uid ${uid}. No subscription record (FREE).`;
      return;
    }
    const data = subSnap.data();
    statusEl.className = "status-line ok";
    statusEl.textContent = `${zPassId} → ${data.plan || "FREE"} / ${data.status || "FREE"} / expires ${fmtDate(data.expiresAt)}`;
  } catch (error) {
    statusEl.className = "status-line err";
    statusEl.textContent = error.message;
  }
});

$("manageGrant").addEventListener("click", async () => {
  const zPassId = $("manageZpId").value.trim();
  const tier = $("manageTier").value;
  const months = parseInt($("manageMonths").value, 10) || 1;
  const statusEl = $("manageStatus");
  try {
    const uid = await findUidByZPassId(zPassId);
    if (!uid) {
      statusEl.className = "status-line err";
      statusEl.textContent = "No user found with that zPassId.";
      return;
    }
    await setDoc(doc(db, "subscriptions", uid), {
      zPassId,
      plan: tier,
      status: "ACTIVE",
      expiresAt: monthsFromNow(months),
      updatedAt: serverTimestamp(),
      grantedManuallyBy: auth.currentUser.email
    }, { merge: true });
    statusEl.className = "status-line ok";
    statusEl.textContent = `Granted ${tier} for ${months} month(s) to ${zPassId}.`;
    loadActive();
  } catch (error) {
    statusEl.className = "status-line err";
    statusEl.textContent = error.message;
  }
});

$("manageRevoke").addEventListener("click", async () => {
  const zPassId = $("manageZpId").value.trim();
  const statusEl = $("manageStatus");
  try {
    const uid = await findUidByZPassId(zPassId);
    if (!uid) {
      statusEl.className = "status-line err";
      statusEl.textContent = "No user found with that zPassId.";
      return;
    }
    await setDoc(doc(db, "subscriptions", uid), {
      status: "REVOKED",
      expiresAt: Timestamp.now(),
      updatedAt: serverTimestamp(),
      revokedBy: auth.currentUser.email
    }, { merge: true });
    statusEl.className = "status-line ok";
    statusEl.textContent = `Revoked subscription for ${zPassId}.`;
    loadActive();
  } catch (error) {
    statusEl.className = "status-line err";
    statusEl.textContent = error.message;
  }
});

// ---------- Active subscriptions ----------

$("activeRefresh").addEventListener("click", loadActive);

async function loadActive() {
  const tbody = document.querySelector("#activeTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(query(
    collection(db, "subscriptions"),
    where("status", "==", "ACTIVE"),
    orderBy("updatedAt", "desc"),
    limit(50)
  ));
  $("activeEmpty").classList.toggle("hidden", !snap.empty);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${data.zPassId || docSnap.id}</td>
      <td>${data.plan || ""}</td>
      <td>${pill(data.status, statusClass(data.status))}</td>
      <td>${fmtDate(data.expiresAt)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- User directory ----------

let userProfiles = [];
$("usersRefresh").addEventListener("click", loadUsers);
$("userSearch").addEventListener("input", renderUsers);

async function loadUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(query(collection(db, "users"), limit(200)));
  userProfiles = snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
  renderUsers();
}

function renderUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  const search = $("userSearch").value.trim().toLowerCase();
  tbody.replaceChildren();
  const matches = userProfiles.filter((user) => {
    const values = [user.zPassId, user.displayName, user.name, user.email, user.uid];
    return values.some((value) => String(value || "").toLowerCase().includes(search));
  });
  $("usersEmpty").classList.toggle("hidden", matches.length > 0);
  matches.forEach((user) => {
    const row = document.createElement("tr");
    const values = [
      user.zPassId || `ZP-${user.uid.slice(0, 6).toUpperCase()}${user.uid.slice(-4).toUpperCase()}`,
      user.displayName || user.name || "—",
      user.email || "—",
      fmtDate(user.createdAt)
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}

// ---------- Payment history ----------

$("paymentsRefresh").addEventListener("click", loadPayments);

async function loadPayments() {
  const tbody = document.querySelector("#paymentsTable tbody");
  tbody.replaceChildren();
  const snap = await getDocs(query(collection(db, "payment_records"), orderBy("createdAt", "desc"), limit(50)));
  $("paymentsEmpty").classList.toggle("hidden", !snap.empty);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    const values = [
      data.zPassId || "—",
      data.email || "—",
      data.plan || "—",
      data.billing || "—",
      Number.isFinite(Number(data.amountUsd)) ? `$${Number(data.amountUsd).toFixed(2)}` : "—",
      data.provider || "—",
      fmtDate(data.createdAt)
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}


// ---------- Updates & releases ----------

const configRef = () => doc(db, "app_config", "public");

function updStatus(text, ok = true) {
  const el = $("updStatus");
  el.textContent = text;
  el.className = "status-line " + (ok ? "ok" : "err");
}

async function loadUpdates() {
  try {
    const d = (await getDoc(configRef())).data() || {};
    $("updName").value = d.latestVersionName || "";
    $("updCode").value = d.latestVersionCode || "";
    $("updMin").value = d.minimumSupportedVersionCode || "";
    $("updUrl").value = d.updateUrl || "";
    $("winVersion").value = d.windowsVersion || "";
    $("winUrl").value = d.windowsUrl || "";
    $("winNotes").value = d.windowsNotes || "";
    $("updAnnouncement").value = d.announcement || "";
    $("updMaintMsg").value = d.maintenanceMessage || "";
    $("updForce").checked = !!d.forceUpdate;
    $("updMaint").checked = !!d.maintenanceMode;
    updStatus("Loaded current settings.");
  } catch (error) {
    updStatus(error.message, false);
  }
}

async function saveUpdates() {
  const code = Number($("updCode").value) || 1;
  const min = Number($("updMin").value) || 1;
  if (min > code) return updStatus("Minimum code cannot be higher than the latest code.", false);
  const announcement = $("updAnnouncement").value.trim();
  const payload = {
    latestVersionName: $("updName").value.trim(),
    latestVersionCode: code,
    minimumSupportedVersionCode: min,
    updateUrl: $("updUrl").value.trim(),
    forceUpdate: $("updForce").checked,
    maintenanceMode: $("updMaint").checked,
    maintenanceMessage: $("updMaintMsg").value.trim() || "Z Pass is temporarily under maintenance.",
    announcement,
    announcementId: announcement ? "a" + Date.now() : "",
    windowsVersion: $("winVersion").value.trim(),
    windowsUrl: $("winUrl").value.trim(),
    windowsNotes: $("winNotes").value.trim(),
    updatedAt: serverTimestamp()
  };
  if (payload.updateUrl && !/^https:\/\//i.test(payload.updateUrl)) return updStatus("Download URL must start with https://", false);
  if (payload.windowsUrl && !/^https:\/\//i.test(payload.windowsUrl)) return updStatus("Windows URL must start with https://", false);
  try {
    await setDoc(configRef(), payload, { merge: true });
    updStatus("Published. Apps pick this up live.");
  } catch (error) {
    updStatus(error.message, false);
  }
}

$("updSave").addEventListener("click", saveUpdates);
$("updReload").addEventListener("click", loadUpdates);
