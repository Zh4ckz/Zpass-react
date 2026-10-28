# Z Pass Cloudflare Pages release control

This folder is a Cloudflare Pages project scaffold. It is not active until the GitHub repository is connected to a Pages project and Cloudflare Access and Worker secrets are configured.

## Pages setup

Create a Cloudflare Pages project connected to `Zh4ckz/Zpass-react`:

- Root directory: `cloudflare/pages`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Add a Pages environment variable: `PAGES_GIT_CONNECTED=true`
- Add `FIREBASE_HOSTING_URL=https://zpass.web.app/` (this checks only the public Hosting response; it cannot read Firebase Auth, Firestore, billing, or suspension details).

The build copies the repository's `public/` website into Pages output and excludes executable installer types. Pages Functions in `functions/` provide the protected admin API.

## Protect the admin page and API

In Cloudflare Zero Trust, create an Access self-hosted application covering the Pages hostname paths `/zpass-release-admin.html` and `/api/admin/*`. Allow only your own admin email. Create an Access application audience and set:

- `ACCESS_TEAM_DOMAIN`: your Cloudflare Access team hostname, for example `team.cloudflareaccess.com`
- `ACCESS_AUD`: the application's audience tag
- `ACCESS_ADMIN_EMAILS`: comma-separated exact administrator email addresses

The API validates the Access JWT signature, issuer, audience, expiration, and email. Do not make the API public.

## GitHub secrets (Pages project → Settings → Variables and Secrets)

Create a fine-grained GitHub token limited to this repository, with **Contents: Read and write** only, then add it as an encrypted secret. Configure:

- `GITHUB_TOKEN` (encrypted secret)
- `GITHUB_OWNER=Zh4ckz`
- `GITHUB_REPO=Zpass-react`
- `GITHUB_BRANCH=main`

Never put this token in HTML, JavaScript, Git, or a browser setting. The uploader permits only JS/MJS/CSS under `public/js/` and `public/css/`, the version JSON, and three explicit public HTML entry files. It rejects executable installers. Each batch becomes one Git commit; a Pages Git integration on `main` then deploys it.

## Preview locally

From this folder run `npm run build`, then use Cloudflare's local Pages tooling if installed. Local status/upload calls require the Access and GitHub secrets, so they will not publish until the real Pages environment is configured.

## APK limitation and Firebase status

This project contains a Blazor WebAssembly PWA (`Zapp/`), not an Android APK project. A PWA can receive new web assets after a Pages deployment and service-worker update. Code bundled inside a native APK cannot be replaced by updating a website; that requires an APK architecture designed to load remote UI or a new APK install. The Firebase status card only reports the public URL's HTTP response. The Firebase project has had a reported phishing-related Hosting suspension; Cloudflare Pages does not clear that suspension or restore Firebase services.
