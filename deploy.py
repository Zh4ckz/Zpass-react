#!/usr/bin/env python3
"""Deploy Z Pass Web application automatically to Firebase Hosting (passgram-org) and GitHub."""
import os
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


def main():
    print("=" * 50)
    print("🚀 Z Pass Auto-Deployer: Firebase & GitHub")
    print("=" * 50)

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
    print("🌐 Firebase URL: https://passgram.web.app")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
