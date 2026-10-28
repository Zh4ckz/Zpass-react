import { requireAdmin } from './_auth.js';
import { githubHeaders } from './_github.js';

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth) return auth;
  const env = context.env;
  const githubConfigured = Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO && env.GITHUB_BRANCH);
  const pagesConfigured = env.PAGES_GIT_CONNECTED === 'true';
  let firebase = { checked: false, error: 'Firebase URL yapılandırılmadı.' };
  if (env.FIREBASE_HOSTING_URL) {
    try {
      const response = await fetch(env.FIREBASE_HOSTING_URL, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(6000) });
      firebase = { checked: true, httpStatus: response.status };
    } catch (error) { firebase = { checked: false, error: 'Firebase adresine ulaşılamadı.' }; }
  }
  let head = null;
  if (githubConfigured) {
    try {
      const url = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/git/ref/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`;
      const response = await fetch(url, { headers: githubHeaders(env.GITHUB_TOKEN) });
      if (response.ok) head = (await response.json()).object.sha;
    } catch {}
  }
  return Response.json({ github: { configured: githubConfigured, owner: env.GITHUB_OWNER || '', repo: env.GITHUB_REPO || '', branch: env.GITHUB_BRANCH || '', head }, pages: { configured: pagesConfigured }, firebase }, { headers: { 'Cache-Control': 'no-store' } });
}
