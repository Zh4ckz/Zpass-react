# Z Pass Master Architecture & Subdomains Roadmap (2026)

This master roadmap explains the exact file structure, domain mappings, and repository layout for Z Pass.

---

## 🌐 Subdomains & Directory Mappings

| Domain / Subdomain | Purpose | Directory Path | Main Files |
| :--- | :--- | :--- | :--- |
| **`zpas.org`** | Main Marketing Landing Page | `public/` | `index.html`, `apps.html`, `api.html`, `faq.html` |
| **`web.zpas.org`** | Telegram Web K Web App & Login | `zpass/web/` | `web.html`, `web-chat.css`, `web-chat.mjs`, `pattern-9.svg` |
| **`translations.zpas.org`** | Telegram Translations Platform | `zpass/translations/` | `translations.html`, `setlanguage.html`, `telegram.css`, `translations.css` |
| **`core.zpas.org`** | Core API & MTProto 2.0 Protocol Docs | `zpass/core/` | `core.html` |
| **`bots.zpas.org`** | Bot API & Payments Platform | `zpass/bots/` | `bots.html` |
| **`docs.zpas.org`** | Legal Info, Privacy & Press Kit | `zpass/docs/` | `docs.html` |

---

## 📱 Android Applications & Libraries

| Project | Location | Description |
| :--- | :--- | :--- |
| **Z Pass Android App** | `C:/Users/rezan/AndroidStudioProjects/ZPassManager` | Primary Native Android App (`com.zpass`) |
| **PassGram Login SDK** | `https://github.com/Zh4ckz/passgram-login-android` | Android Library for PassGram Login Credential Manager |

---

## 🔄 Automated Deployment Commands

- **Deploy All Subdomains & Web Apps**:
  ```bash
  python deploy.py
  ```
- **Local Web Test Server**:
  ```batch
  start-local.bat
  ```
