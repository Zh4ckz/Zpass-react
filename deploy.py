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


# Each site module is self-contained: <module>/<module>.html plus its own css/, js/ and lang/ folders.
# Entry files are bundled and minified into opaque hashed names under public/resources.
MODULES = {
    "web": {"css": ["css/web-chat.css"], "js": ["js/web-chat.mjs", "js/vendor/qrcode-generator.js"]},
    "docs": {"css": ["css/docs.css"], "js": ["js/docs.js"]},
    "core": {"css": ["css/core.css"], "js": []},
    "bots": {"css": ["css/bots.css"], "js": []},
}


def _short_name(path):
    digest = int(hashlib.sha256(open(path, "rb").read()).hexdigest()[:16], 16)
    chars, out = "0123456789abcdefghijklmnopqrstuvwxyz", ""
    while digest and len(out) < 10:
        digest, rem = divmod(digest, 36)
        out += chars[rem]
    return out.rjust(10, "x")


def build_modules():
    """Build every module into public/: hashed css/js bundles and a rewritten <module>.html."""
    public_dir = os.path.join(ROOT, "public")
    esbuild = os.path.join(ROOT, "node_modules", ".bin", "esbuild.cmd" if os.name == "nt" else "esbuild")
    if not os.path.exists(esbuild):
        raise SystemExit("esbuild missing. Run: npm install")

    out_dirs = {
        "css": os.path.join(public_dir, "resources", "css"),
        "js": os.path.join(public_dir, "resources", "js"),
    }
    for folder in out_dirs.values():
        for old in os.listdir(folder):
            if re.fullmatch(r"[a-z0-9]{10}\.(js|css)", old):
                os.remove(os.path.join(folder, old))

    work = os.path.join(ROOT, ".build-work")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    for mod, spec in MODULES.items():
        mod_dir = os.path.join(ROOT, mod)
        html = open(os.path.join(mod_dir, f"{mod}.html"), encoding="utf-8").read()
        names = {}
        for kind in ("css", "js"):
            for rel in spec[kind]:
                args = [os.path.join(mod_dir, *rel.split("/"))]
                if kind == "js":
                    args += ["--bundle", "--format=esm", "--external:https://*"]
                ext = kind
                tmp = os.path.join(work, f"{mod}-{kind}-{len(names)}.{ext}")
                subprocess.run([esbuild, *args, "--minify", "--legal-comments=none", f"--outfile={tmp}"],
                               check=True, capture_output=True, cwd=ROOT)
                hashed = f"{_short_name(tmp)}.{ext}"
                shutil.copy2(tmp, os.path.join(out_dirs[kind], hashed))
                html = re.sub(re.escape(f"/resources/{rel}") + r"(\?v=\d+)?", f"/resources/{kind}/{hashed}", html)
                names[rel] = hashed
        with open(os.path.join(public_dir, f"{mod}.html"), "w", encoding="utf-8", newline="") as fh:
            fh.write(html)
        print(f"Build {mod}: {names}", flush=True)
    shutil.rmtree(work, ignore_errors=True)


def main():
    print("=" * 50)
    print("🚀 Z Pass Auto-Deployer: Firebase & GitHub")
    print("=" * 50)

    # 0. Sync modular folders into public
    print("\n[0/2] Building site modules (web, core, bots, docs)...", flush=True)
    build_modules()

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
