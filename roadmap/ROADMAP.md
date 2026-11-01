# PassGram / Z Pass Roadmap (2026)

## Live structure

| Domain | Purpose | Source |
| :--- | :--- | :--- |
| `zpas.org` / `passgram.web.app` | Marketing site (home, apps, API, FAQ, privacy, security) | `public/*.html` |
| `web.zpas.org/web` | PassGram Web (QR / code / passkey login, private chat) | `web/` |
| `core.zpas.org` | Protocol and core docs | `core/` |
| `bots.zpas.org` | Bot API and payments | `bots/` |
| `docs.zpas.org` | Legal, privacy, press kit | `docs/` |

The translations site has been removed. Unknown URLs now show the PassGram 404 page.
Translation text will be managed by the admin (not by users).

## `public/` layout

- Root: only `.html` pages. URLs are clean (`/web`, `/apps`, no `.html`).
- `public/resources/css`, `js`, `img`, `images`: all site assets.
- `public/resources/assets/flags`: all flag images (merged).
- `public/resources/assets/lang/{json,marketing,support}`: language catalogs.
- Web app bundle files get opaque hashed names in `resources/js` and `resources/css`.

## Done

- [x] Modern 3-colour redesign (white / black / blue).
- [x] Login only from apps or by typing `web.zpas.org`; no login buttons on the marketing site.
- [x] Free QR login via Firestore and a local bot (no Cloud Functions, no Blaze).
- [x] Web app is English by default, Turkish selectable (TR/EN button).
- [x] Light/dark inverted login card, empty QR loading box, generic error messages.
- [x] Clean URLs, obfuscated bundle names, no third-party brand names in the web app.
- [x] Premium page: prices roll up (yearly) or down (monthly) when the billing period changes.
- [x] Assets reorganised under `public/resources`.
- [x] Translations site removed.

## Next

- [ ] Phone / e-mail code login on the clients (web, Windows exe) using the Firestore OTP flow. The JS bot side is written; Python bot has no OTP code yet.
- [ ] Build and install a new Android APK (Firestore-based QR approval).
- [ ] Admin panel for editing translation text (admin-only).
- [ ] Redesign the web app UI further (new design, not a copy of any messenger).
- [ ] Python bot: `tomsss` invoice-sync PermissionDenied; compare JS vs Python bot features.
- [ ] Remove the `translations.zpas.org` custom domain in Firebase Hosting.
- [ ] Authenticate GitHub for `git push`.

## Repositories

| Project | Location |
| :--- | :--- |
| Android app | `C:/Users/rezan/AndroidStudioProjects/ZPassManager` |
| Windows exe | `C:/Users/rezan/source/repos/ZPassManager` |
| Login SDK | `https://github.com/Zh4ckz/passgram-login-android` |
| JS bot (active) | `C:/Users/rezan/Desktop/Bots-JS/payment-bot` |
| Python bot | `C:/Users/rezan/Desktop/Bots/Payment-bot` |

## Commands

- Deploy: `python deploy.py` (set `PYTHONIOENCODING=utf-8` on Windows).
- Start / stop bots: `Start All Bots.bat` and `Stop All Bots.bat` on the Desktop.
