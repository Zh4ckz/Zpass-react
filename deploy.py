#!/usr/bin/env python3
"""Deploy Z Pass Web application automatically to Firebase Hosting (passgram-org) and GitHub."""
import hashlib
import os
import re
import subprocess
import sys
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DEPLOYMENTS = (
    (
        "passgram.web.app / web.zpas.org",
        [
            "deploy",
            "--only",
            "hosting",
            "--project",
            "passgram-org",
            "--non-interactive",
            "--config",
            "firebase.json",
        ],
    ),
)


def sync_modules():
    """Copy modular top-level folders into public/ for hosting deployment."""
    public_dir = os.path.join(ROOT, "public")
    if not os.path.exists(public_dir):
        os.makedirs(public_dir, exist_ok=True)

    modules = ["web", "core", "bots", "docs"]
    for mod in modules:
        mod_dir = os.path.join(ROOT, mod)
        if os.path.exists(mod_dir):
            for item in os.listdir(mod_dir):
                s = os.path.join(mod_dir, item)
                d = os.path.join(public_dir, item)
                if not os.path.isfile(s):
                    continue
                ext = os.path.splitext(item)[1].lower()
                if ext == ".html":
                    shutil.copy2(s, d)
                elif ext == ".js" and not item.startswith("web-"):
                    shutil.copy2(s, os.path.join(public_dir, "resources", "js", item))
                elif ext == ".css" and not item.startswith("web-"):
                    shutil.copy2(s, os.path.join(public_dir, "resources", "css", item))


def _short_name(path):
    digest = int(hashlib.sha256(open(path, "rb").read()).hexdigest()[:16], 16)
    chars, out = "0123456789abcdefghijklmnopqrstuvwxyz", ""
    while digest and len(out) < 10:
        digest, rem = divmod(digest, 36)
        out += chars[rem]
    return out.rjust(10, "x")


def build_web():
    """Bundle and minify the web app into files with opaque names, then point web.html at them."""
    public_dir = os.path.join(ROOT, "public")
    esbuild = os.path.join(ROOT, "node_modules", ".bin", "esbuild.cmd" if os.name == "nt" else "esbuild")
    if not os.path.exists(esbuild):
        raise SystemExit("esbuild missing. Run: npm install")

    js_dir = os.path.join(public_dir, "resources", "js")
    css_dir = os.path.join(public_dir, "resources", "css")
    for folder in (js_dir, css_dir):
        for old in os.listdir(folder):
            if re.fullmatch(r"[a-z0-9]{10}\.(js|css)", old):
                os.remove(os.path.join(folder, old))

    work = os.path.join(ROOT, ".build-web")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    shutil.copy2(os.path.join(ROOT, "web", "web-chat.mjs"), work)
    shutil.copy2(os.path.join(ROOT, "web", "web-i18n.mjs"), work)
    shutil.copy2(os.path.join(js_dir, "firebase-config.mjs"), work)
    jobs = {
        "app": [os.path.join(work, "web-chat.mjs"), "--bundle", "--format=esm", "--external:https://*"],
        "qr": [os.path.join(js_dir, "vendor", "qrcode-generator.js")],
        "css": [os.path.join(ROOT, "web", "web-chat.css")],
    }
    names = {}
    for key, args in jobs.items():
        ext = "css" if key == "css" else "js"
        tmp = os.path.join(work, f"{key}.out.{ext}")
        subprocess.run([esbuild, *args, "--minify", "--legal-comments=none", f"--outfile={tmp}"],
                       check=True, capture_output=True, cwd=ROOT)
        names[key] = f"{_short_name(tmp)}.{ext}"
        shutil.copy2(tmp, os.path.join(css_dir if ext == "css" else js_dir, names[key]))
    shutil.rmtree(work, ignore_errors=True)

    html_path = os.path.join(ROOT, "web", "web.html")
    html = open(html_path, encoding="utf-8").read()
    html = re.sub(r"/resources/css/web-chat\.css\?v=\d+", "/resources/css/" + names["css"], html)
    html = html.replace("/resources/js/vendor/qrcode-generator.js", "/resources/js/" + names["qr"])
    html = re.sub(r"/resources/js/web-chat\.mjs\?v=\d+", "/resources/js/" + names["app"], html)
    with open(os.path.join(public_dir, "web.html"), "w", encoding="utf-8", newline="") as fh:
        fh.write(html)

    for leftover in ("resources/js/web-chat.mjs", "resources/css/web-chat.css"):
        try:
            os.remove(os.path.join(public_dir, *leftover.split("/")))
        except FileNotFoundError:
            pass
    print(f"Web build: {names}", flush=True)


def main():
    print("=" * 50)
    print("🚀 Z Pass Auto-Deployer: Firebase & GitHub")
    print("=" * 50)

    # 0. Sync modular folders into public
    print("\n[0/2] Syncing modular folders (web, core, bots, docs)...", flush=True)
    sync_modules()
    build_web()

    # 1. Deploy to Firebase Hosting
    firebase_cmd = shutil.which("firebase.cmd") or shutil.which("firebase") or "firebase"

    for site, arguments in DEPLOYMENTS:
        print(f"\n[1/2] Deploying to Firebase Hosting ({site})...", flush=True)
        cmd = [firebase_cmd, *arguments]
        result = subprocess.run(cmd, cwd=ROOT, check=False, shell=(os.name == "nt"))
        
        if result.returncode != 0:
            print(f"⚠️ Firebase deployment to {site} failed with exit code {result.returncode}.", file=sys.stderr)
            return result.returncode
        print(f"✅ Firebase deployment to {site} completed successfully!", flush=True)

    # 2. Push to GitHub Repository
    print("\n[2/2] Syncing and pushing changes to GitHub...", flush=True)
    try:
        subprocess.run(["git", "add", "-A"], cwd=ROOT, check=False)
        subprocess.run(["git", "commit", "-m", "Auto-deploy update to passgram-org and web.zpas.org"], cwd=ROOT, check=False)
        push_res = subprocess.run(["git", "push", "origin", "main"], cwd=ROOT, check=False)
        if push_res.returncode == 0:
            print("✅ GitHub synchronization complete!", flush=True)
        else:
            print("⚠️ Git push returned non-zero code, continuing...", flush=True)
    except Exception as e:
        print(f"⚠️ Git sync note: {e}", flush=True)

    print("\n" + "=" * 50)
    print("🎉 ALL DEPLOYMENTS COMPLETE!")
    print("🌐 Live Web App: https://web.zpas.org")
    print("🌐 Core Docs: https://core.zpas.org")
    print("🌐 Firebase URL: https://passgram.web.app")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
