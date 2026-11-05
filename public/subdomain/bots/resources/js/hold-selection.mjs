export const HOLD_MS = 1800;
export function addRange(selected, ids, from, to) {
  if (from < 0 || to < 0) return selected;
  for (let i = Math.min(from, to); i <= Math.max(from, to) && i < ids.length; i++) selected.add(ids[i]);
  return selected;
}

// Delegated handlers survive list rerenders; selection state uses record IDs, never indexes.
export function installHoldSelection(list, onChange = () => {}) {
  const selected = new Set();
  let pending, pointer = null, origin, last = -1, active = false, dragging = false, frame;
  let x = 0, y = 0, suppressClick = false;
  const rows = () => [...list.querySelectorAll('[data-record-id]')];
  function refresh() {
    for (const row of rows()) {
      const checked = selected.has(row.dataset.recordId);
      row.classList.toggle('hold-selected', checked);
      row.setAttribute('aria-selected', String(checked));
    }
    onChange(selected.size, active);
  }
  function clear() { stop(); selected.clear(); active = false; refresh(); }
  function select(index) {
    const items = rows();
    if (index < 0) return;
    addRange(selected, items.map(row => row.dataset.recordId), last < 0 ? index : last, index);
    last = index; refresh();
  }
  function atPointer() {
    const bounds = list.getBoundingClientRect();
    const row = document.elementFromPoint(Math.max(2, bounds.left + 2, Math.min(innerWidth - 2, bounds.right - 2, x)), Math.max(2, bounds.top + 2, Math.min(innerHeight - 2, bounds.bottom - 2, y)))?.closest('[data-record-id]');
    if (row && list.contains(row)) select(rows().indexOf(row));
  }
  function scrollLoop() {
    if (!dragging) return;
    const bounds = list.getBoundingClientRect();
    let scroll = list;
    while (scroll !== document.documentElement && scroll.scrollHeight <= scroll.clientHeight) scroll = scroll.parentElement || document.documentElement;
    const area = scroll.getBoundingClientRect();
    const top = Math.max(0, bounds.top, area.top), bottom = Math.min(innerHeight, bounds.bottom, area.bottom);
    if (y < top + 36) scroll.scrollTop -= Math.min(24, 5 + (top + 36 - y) / 4);
    if (y > bottom - 36) scroll.scrollTop += Math.min(24, 5 + (y - bottom + 36) / 4);
    atPointer(); frame = requestAnimationFrame(scrollLoop);
  }
  function stop() {
    clearTimeout(pending); cancelAnimationFrame(frame);
    dragging = false; last = -1;
    const previous = pointer; pointer = null;
    if (previous != null && list.hasPointerCapture?.(previous)) list.releasePointerCapture(previous);
    list.classList.remove('hold-dragging');
  }
  function begin(index, id) {
    if (pointer !== id) return;
    active = true; dragging = true; suppressClick = true; last = index;
    select(index); list.classList.add('hold-dragging');
    list.setPointerCapture?.(id); frame = requestAnimationFrame(scrollLoop);
  }
  list.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button,a,input,select,textarea')) return;
    const row = event.target.closest('[data-record-id]');
    if (!row) return;
    stop(); suppressClick = false; pointer = event.pointerId; origin = { x: event.clientX, y: event.clientY };
    x = event.clientX; y = event.clientY;
    const index = rows().indexOf(row), id = pointer;
    if (active) { event.preventDefault(); begin(index, id); }
    else pending = setTimeout(() => begin(index, id), HOLD_MS);
  });
  list.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    x = event.clientX; y = event.clientY;
    if (!dragging && Math.hypot(x - origin.x, y - origin.y) > 8) clearTimeout(pending);
    if (dragging) { event.preventDefault(); atPointer(); }
  });
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
  list.addEventListener('lostpointercapture', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { clear(); event.preventDefault(); } });
  list.addEventListener('click', event => {
    if (suppressClick || active) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, true);
  window.addEventListener('zpass:scopechange', clear);
  return { selected, clear, refresh };
}
