// The same rules are implemented by ZPass-Modern/Cloud/VaultItemState.cs.
export const scope = { view: 'all', folder: '' };
export const archiveNames = new Set(['archive', 'archived', 'arşiv', 'arsiv']);
export function archived(item) {
  return item.archived === true || item.isArchived === true || archiveNames.has(String(item.category || '').trim().toLocaleLowerCase('en-US'));
}
export function matchesScope(item, selection = scope) {
  if (selection.view === 'archive') return archived(item);
  if (archived(item)) return false;
  const category = String(item.category || '').trim();
  return selection.view === 'folder' ? category.toLocaleLowerCase('en-US') === selection.folder.trim().toLocaleLowerCase('en-US') : category === '';
}
export function visibleItems(items, selection = scope, query = '') {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter(item => matchesScope(item, selection) && (!needle || [item.platform,item.username,item.domain,item.category].some(value => String(value || '').toLocaleLowerCase().includes(needle))));
}
export function setScope(view, folder = '') {
  scope.view = view; scope.folder = folder;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('zpass:scopechange'));
}
