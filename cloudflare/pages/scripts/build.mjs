import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..', '..');
const source = resolve(root, 'public');
const output = resolve(process.cwd(), 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, {
  recursive: true,
  filter: (src) => !/\.(?:apk|ipa|exe|dll|bat|msi|msix)$/i.test(src),
});
console.log(`Cloudflare Pages output prepared from ${source}`);
