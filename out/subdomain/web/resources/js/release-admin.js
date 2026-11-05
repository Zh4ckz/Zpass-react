const input = document.querySelector('#file-input');
const list = document.querySelector('#file-list');
const publish = document.querySelector('#publish');
const result = document.querySelector('#result');
const dropzone = document.querySelector('#dropzone');
let selected = [];
const allowed = new Set(['js', 'mjs', 'css', 'json', 'html']);
const maxTotal = 4 * 1024 * 1024;

function formatSize(size) { return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(0)} KB`; }
function ext(name) { return (name.split('.').pop() || '').toLowerCase(); }
function showResult(message, kind) { result.hidden = false; result.className = `result ${kind}`; result.textContent = message; }

function renderFiles() {
  if (!selected.length) {
    list.innerHTML = '<div class="empty-files"><span>01</span> Henüz seçilen dosya yok</div>';
    publish.disabled = true;
    document.querySelector('#file-summary').textContent = 'Dosyalar güvenli bağlantı üzerinden gönderilir.';
    return;
  }
  list.replaceChildren();
  selected.forEach((entry, index) => {
    const row = document.createElement('div'); row.className = 'file-row';
    const type = document.createElement('span'); type.className = 'file-type'; type.textContent = ext(entry.path).toUpperCase();
    const info = document.createElement('div'); info.className = 'file-info';
    const name = document.createElement('b'); name.textContent = entry.file.name;
    const path = document.createElement('input'); path.value = entry.path; path.setAttribute('aria-label', `${entry.file.name} hedef yolu`);
    path.addEventListener('input', () => { entry.path = path.value.trim(); validate(); });
    info.append(name, path);
    const size = document.createElement('span'); size.className = 'file-size'; size.textContent = formatSize(entry.file.size);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-file'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Dosyayı kaldır');
    remove.addEventListener('click', () => { selected.splice(index, 1); renderFiles(); });
    row.append(type, info, size, remove); list.append(row);
  });
  validate();
}

function validate() {
  const total = selected.reduce((sum, e) => sum + e.file.size, 0);
  const pathsOkay = selected.every(e => {
    const p = e.path.replaceAll('\\', '/');
    return p.startsWith('public/') && !p.includes('..') && !p.split('/').some(part => part.startsWith('.')) && allowed.has(ext(p));
  });
  const filesOkay = selected.every(e => e.file.size > 0 && e.file.size <= maxTotal);
  publish.disabled = !selected.length || selected.length > 16 || total > maxTotal || !pathsOkay || !filesOkay;
  document.querySelector('#file-summary').textContent = selected.length > 16 ? 'Tek yayında en fazla 16 dosya seç.' : total > maxTotal ? 'Toplam boyut 4 MB sınırını aşıyor.' : !pathsOkay ? 'Yollar public/ altında olmalı; JS, MJS, CSS, JSON veya HTML seç.' : `${selected.length} dosya · ${formatSize(total)} · tek GitHub commit'i`;
}

function addFiles(files) {
  result.hidden = true;
  const incoming = Array.from(files);
  for (const file of incoming) {
    const rel = file.webkitRelativePath || file.name;
    const cleanRel = rel.replace(/^\/+/, '');
    const path = cleanRel.startsWith('public/') ? cleanRel : cleanRel.includes('/') ? `public/${cleanRel}` : `public/js/${cleanRel}`;
    selected.push({ file, path });
  }
  renderFiles();
}
input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
for (const eventName of ['dragenter', 'dragover']) dropzone.addEventListener(eventName, e => { e.preventDefault(); dropzone.classList.add('drag'); });
for (const eventName of ['dragleave', 'drop']) dropzone.addEventListener(eventName, e => { e.preventDefault(); dropzone.classList.remove('drag'); });
dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function refreshStatus() {
  const btn = document.querySelector('#refresh'); btn.disabled = true;
  try {
    const response = await fetch('/api/admin/status', { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Cloudflare Access oturumu gerekli.' : `Durum alınamadı (HTTP ${response.status}).`);
    const data = await response.json();
    setStatus('github', data.github?.configured ? 'ok' : 'warn', data.github?.configured ? `Bağlı depo: ${data.github.owner}/${data.github.repo} · ${data.github.branch}` : 'GitHub Worker sırları henüz eklenmedi.');
    setStatus('pages', data.pages?.configured ? 'ok' : 'warn', data.pages?.configured ? 'Pages Git bağlantısı ayarlandıysa commit sonrası dağıtım başlar.' : 'Pages üretim dalını GitHub deposuna bağla.');
    const code = data.firebase?.httpStatus;
    if (!data.firebase?.checked) setStatus('firebase', 'warn', data.firebase?.error || 'Uç nokta kontrol edilemedi.');
    else if (code >= 200 && code < 400) setStatus('firebase', 'ok', `Hosting yanıt veriyor (HTTP ${code}). Bu, Auth/Firestore durumunu göstermez.`);
    else setStatus('firebase', 'error', `Hosting HTTP ${code}. Bu projede daha önce askıya alma uyarısı görüldü; Firebase Console'dan durumu kontrol et. Cloudflare bunu açamaz.`);
    if (data.github?.head) setStatus('github', 'ok', `Depo: ${data.github.owner}/${data.github.repo} · ${data.github.branch} · ${data.github.head.slice(0, 7)}`);
  } catch (error) {
    setStatus('github', 'warn', error.message);
    setStatus('pages', 'warn', 'Durum servisi yapılandırılmamış veya Access oturumu kapalı.');
    setStatus('firebase', 'warn', 'Durum servisi yapılandırılmadan kontrol edilemez.');
  } finally { btn.disabled = false; }
}
function setStatus(key, level, text) {
  const badge = document.querySelector(`#${key}-badge`); const detail = document.querySelector(`#${key}-detail`);
  badge.className = `badge ${level}`; badge.textContent = level === 'ok' ? 'Hazır' : level === 'error' ? 'Sorun var' : 'Kurulum gerekli'; detail.textContent = text;
}

publish.addEventListener('click', async () => {
  if (publish.disabled) return;
  publish.disabled = true; publish.querySelector('span').textContent = 'Commit hazırlanıyor…'; result.hidden = true;
  try {
    const files = await Promise.all(selected.map(async ({ file, path }) => ({ path, contentBase64: await fileToBase64(file) })));
    const response = await fetch('/api/admin/publish', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message: document.querySelector('#commit-message').value.trim(), files }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `GitHub işlemi başarısız (HTTP ${response.status}).`);
    showResult(`Commit ${data.commit.slice(0, 7)} GitHub'a yazıldı. Cloudflare Pages, bağlı üretim dalındaysa dağıtımı başlatır. Dağıtımın tamamlanması birkaç dakika sürebilir.`, 'success');
    selected = []; renderFiles(); refreshStatus();
  } catch (error) { showResult(error.message, 'error'); }
  finally { publish.querySelector('span').textContent = "GitHub'a gönder"; validate(); }
});
document.querySelector('#refresh').addEventListener('click', refreshStatus);
refreshStatus();
