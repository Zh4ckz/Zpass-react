import { requireAdmin } from './_auth.js';
import { githubHeaders } from './_github.js';

const MAX_FILES = 16;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const EXTENSIONS = new Set(['js', 'mjs', 'css', 'json', 'html']);
const ALLOWED_HTML = new Set(['public/index.html', 'public/web.html', 'public/profile.html']);

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth) return auth;
  const { env, request } = context;
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH) return fail(503, 'GitHub secrets yapılandırılmamış.');
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > 6 * 1024 * 1024) return fail(413, 'İstek 6 MB sınırını aşıyor.');
  let payload;
  try { payload = await request.json(); } catch { return fail(400, 'Geçerli JSON gönder.'); }
  if (!Array.isArray(payload.files) || payload.files.length < 1 || payload.files.length > MAX_FILES) return fail(400, `1–${MAX_FILES} dosya seç.`);
  const normalized = [];
  let total = 0;
  for (const item of payload.files) {
    const path = String(item.path || '').replaceAll('\\', '/');
    if (!isAllowedPath(path)) return fail(400, `İzin verilmeyen yol: ${path}`);
    if (normalized.some(file => file.path === path)) return fail(400, `Aynı yol iki kez seçilmiş: ${path}`);
    const base64 = String(item.contentBase64 || '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return fail(400, `Dosya içeriği geçersiz: ${path}`);
    const bytes = decodeBase64(base64);
    total += bytes.byteLength;
    if (!bytes.byteLength || bytes.byteLength > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES) return fail(413, 'Dosya başına 1 MB, toplam 4 MB sınırı var.');
    normalized.push({ path: path.slice('public/'.length), content: base64 });
  }
  const owner = env.GITHUB_OWNER; const repo = env.GITHUB_REPO; const branch = env.GITHUB_BRANCH;
  const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = { ...githubHeaders(env.GITHUB_TOKEN), 'Content-Type': 'application/json' };
  try {
    const refResponse = await fetch(`${api}/git/ref/heads/${encodeURIComponent(branch)}`, { headers });
    if (!refResponse.ok) return githubError(refResponse, 'GitHub dalı okunamadı.');
    const ref = await refResponse.json();
    const parentSha = ref.object.sha;
    const parentResponse = await fetch(`${api}/git/commits/${parentSha}`, { headers });
    if (!parentResponse.ok) return githubError(parentResponse, 'GitHub temel commit okunamadı.');
    const parent = await parentResponse.json();
    const tree = [];
    for (const file of normalized) {
      const blobResponse = await fetch(`${api}/git/blobs`, { method: 'POST', headers, body: JSON.stringify({ content: file.content, encoding: 'base64' }) });
      if (!blobResponse.ok) return githubError(blobResponse, `Git blob oluşturulamadı: ${file.path}`);
      const blob = await blobResponse.json();
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const treeResponse = await fetch(`${api}/git/trees`, { method: 'POST', headers, body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
    if (!treeResponse.ok) return githubError(treeResponse, 'Git tree oluşturulamadı.');
    const newTree = await treeResponse.json();
    const message = String(payload.message || 'Z Pass web update').replace(/[\r\n]+/g, ' ').trim().slice(0, 120) || 'Z Pass web update';
    const commitResponse = await fetch(`${api}/git/commits`, { method: 'POST', headers, body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }) });
    if (!commitResponse.ok) return githubError(commitResponse, 'GitHub commit oluşturulamadı.');
    const commit = await commitResponse.json();
    const updateResponse = await fetch(`${api}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', headers, body: JSON.stringify({ sha: commit.sha, force: false }) });
    if (!updateResponse.ok) return githubError(updateResponse, 'Commit oluşturuldu ancak dal güncellenemedi. Dal koruması veya yetkiyi kontrol et.');
    return Response.json({ ok: true, commit: commit.sha, files: normalized.map(f => `public/${f.path}`) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(502, 'GitHub API bağlantısı başarısız. Cloudflare loglarını kontrol et.'); }
}

function isAllowedPath(path) {
  if (!path.startsWith('public/') || path.includes('..') || path.startsWith('public/.') || path.split('/').some(part => part.startsWith('.'))) return false;
  const ext = path.split('.').pop().toLowerCase();
  if (!EXTENSIONS.has(ext)) return false;
  if (ext === 'html') return ALLOWED_HTML.has(path);
  if (ext === 'json') return path === 'public/api/zpass-version.json';
  return path.startsWith('public/js/') || path.startsWith('public/css/');
}
function decodeBase64(value) { const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0)); }
function fail(status, error) { return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function githubError(response, fallback) {
  const status = response.status;
  return fail(status === 401 || status === 403 ? 502 : status, `${fallback} GitHub HTTP ${status}.`);
}
