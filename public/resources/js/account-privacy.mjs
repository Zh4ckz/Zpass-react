// Presentation only: never use a masked address for authentication or delivery.
export function maskEmail(email) {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@') || at === value.length - 1 || /\s/u.test(value)) return '—';
  const local = Array.from(value.slice(0, at));
  return local[0] + '*'.repeat(Math.max(1, local.length - 2)) + (local.length > 1 ? local.at(-1) : '') + value.slice(at);
}
