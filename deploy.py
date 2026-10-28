#!/usr/bin/env python3
"""Deploy the Z Pass primary Hosting site to zpass.web.app."""
import os
import subprocess
import sys
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DEPLOYMENTS = (
    (
        "zpass.web.app",
        [
            "deploy",
            "--only",
            "hosting:zpass",
            "--project",
            "zpasss",
            "--non-interactive",
            "--config",
            "firebase.json",
        ],
    ),
)


def main():
    # Windows ebong Anya OS-er jonno firebase command-er path thik kora
    firebase_cmd = shutil.which("firebase") or "firebase"
    if os.name == "nt":
        # Windows-er jonno firebase.cmd ba npx babohar kora valo
        firebase_cmd = "firebase.cmd" if shutil.which("firebase.cmd") else "firebase"

    for site, arguments in DEPLOYMENTS:
        print(f"\nDeploying {site}...", flush=True)
        # Windows-e shell=True dewa lagte pare jate .cmd file thikmoto execute hoy
        cmd = [firebase_cmd, *arguments]
        result = subprocess.run(cmd, cwd=ROOT, check=False, shell=(os.name == "nt"))
        
        if result.returncode:
            print(f"Deployment to {site} failed with exit code {result.returncode}.", file=sys.stderr)
            return result.returncode
        print(f"Deployment to {site} completed.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
