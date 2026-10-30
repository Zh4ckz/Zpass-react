# 🛡️ Z Pass — Complete Master Platform Architecture & Technical Guide

Welcome to **Z Pass**, a privacy-first Password Manager, Encrypted Messenger, and Community Translations Ecosystem built for Android, Windows, and the Web.

This document serves as the master technical guide for developers and AI assistants working on the project.

---

## 🌐 1. Subdomains & Web Architecture

All subdomains serve dedicated, modular web applications built to match Telegram's ecosystem standards:

| Subdomain / URL | Description | Source Directory | Key Files |
| :--- | :--- | :--- | :--- |
| **`https://zpas.org`** | Main Marketing Landing Page | `public/` | `index.html`, `apps.html`, `api.html`, `faq.html` |
| **`https://web.zpas.org`** | Telegram Web K Web App & Login | `web/` | `web.html`, `web-chat.css`, `web-chat.mjs`, `pattern-9.svg` |
| **`https://translations.zpas.org`** | Telegram Translations Platform | `translations/` | `translations.html`, `setlanguage.html`, `telegram.css`, `translations.css`, `main-aj.js` |
| **`https://core.zpas.org`** | Core API & MTProto 2.0 Protocol Docs | `core/` | `core.html` |
| **`https://bots.zpas.org`** | Bot API & Webhook Infrastructure | `bots/` | `bots.html` |
| **`https://docs.zpas.org`** | Privacy Policy, Press Kit & Legal Terms | `docs/` | `docs.html` |

---

## 📂 2. Modular Directory Layout

The repository uses top-level isolated directories for each subdomain and platform service:

```text
Zpass/
├── web/                  # Telegram Web K App (web.html, web-chat.css, web-chat.mjs)
├── translations/         # Telegram Translations Platform (translations.html, setlanguage.html, CSS/JS)
├── core/                 # Core API & MTProto 2.0 Specifications (core.html)
├── bots/                 # Bot API & Webhook Specifications (bots.html)
├── docs/                 # Privacy Policy, Legal & Press Kit (docs.html)
├── roadmap/              # Master Roadmap & Architecture Guide (ROADMAP.md)
├── public/               # Static assets & Firebase Hosting deployment target
├── deploy.py             # One-click deployment script (Sync + Firebase + GitHub)
├── deploy.bat            # Windows batch launcher for deploy.py
├── start-local.bat       # Local HTTP test server launcher (http://localhost:5000)
└── firebase.json         # Firebase Hosting rewrites, headers, and clean URL rules
```

---

## 📱 3. Android App Integration (`com.zpass`)

- **Native Google Sign-In & Credentials**:
  - Implemented using `GetGoogleIdOption` and `GoogleSignInClient` fallback.
  - Automatically handles `28444` Play Services errors without opening browser tabs.
  - Signed with custom release keystore `zpass-release.jks` (`4D:D2:B5:30:7D:03:82:45:77:37:91:5F:B4:61:1E:5D:55:1E:D7:35`).

- **Telegram-Style Deep Link Language Switcher**:
  - Deep link handler for `https://zpas.org/setlanguage/{code}` and `zpass://setlanguage?lang={code}`.
  - Opens Telegram-style `SetLanguageConfirmationDialog` showing:
    - Target Language Name & Code.
    - Progress Bar & Completion Percentage (e.g. `85% completed`).
    - **CANCEL** button in RED (`#e53935`).
    - **CHANGE** button in BLUE (`#3390ec`).

- **Chat & Messaging Features**:
  - **Hashtags (`#hashtag`)**: Tappable hashtags in messages; opens global hashtag search across chats, channels, and groups.
  - **Dedicated Search Bars**: "New message" screen searches local contacts (`Search contacts`); main Chats screen searches everything (`Search chats`).
  - **Single Squircle Composer**: Attachment clip 📎, text input, GIF button, and Emoji 😀 icon combined inside one sleek rounded pill container next to the Voice Note Mic 🎙️ / Send button.

---

## ⚡ 4. Web Engine & URL Routing Rules

1. **Clean URLs (Zero `.html` extensions)**:
   - All URLs use clean path syntax: `/apps`, `/api`, `/safety`, `/privacy`, `/faq`, `/translations`, `/setlanguage/ku`.
2. **Zero 404 Error Fallback**:
   - Any non-existent route on `zpas.org` falls back gracefully to `/index.html` (Home Page) rather than showing a broken 404 error page.
3. **Telegram AJAX Navigation Engine (`main-aj.js`)**:
   - Uses Telegram's official `main-aj.js` engine and top progress bar (`#aj_progress`).
   - Page transitions happen in 0ms with clean `history.pushState` updates.

---

## 🚀 5. One-Click Deployment Automation

To sync all modular directories, deploy to Firebase Hosting (`passgram-org`), and push to GitHub (`Zh4ckz/Zpass-react`), run:

```bash
python deploy.py
```
Or double-click `deploy.bat` on Windows.
