"""Hapus berkas di Apps Script yang sudah tidak ada di lokal.

clasp v3 `push` hanya mengunggah berkas yang ADA di lokal; berkas yang kita
hapus dari Active/ tetap hidup di remote dan tetap dieksekusi runtime.
Script ini menutup celah itu lewat Apps Script API projects.updateContent.

Pakai:
    python tools/clasp_prune.py            # dry-run, hanya melaporkan
    python tools/clasp_prune.py --apply    # benar-benar menghapus
    python tools/clasp_prune.py --apply --force   # izinkan hapus >3 berkas
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ACTIVE = Path(__file__).resolve().parent.parent / "Active"
CLASPRC = Path.home() / ".clasprc.json"
PUSHABLE = {".js", ".gs", ".html", ".json"}
MIN_LOCAL_FILES = 5   # tolak jalan kalau folder lokal terlihat kosong/rusak
MAX_DELETIONS = 3     # di atas ini butuh --force


def die(msg):
    print(f"[clasp-prune] BATAL: {msg}")
    sys.exit(1)


def access_token():
    """Ambil token clasp; refresh sendiri kalau sudah kedaluwarsa."""
    if not CLASPRC.exists():
        die(f"{CLASPRC} tidak ada - jalankan `clasp login` dulu.")
    rc = json.loads(CLASPRC.read_text(encoding="utf-8"))
    tok = rc["tokens"]["default"]
    if tok.get("expiry_date", 0) / 1000 > time.time() + 60:
        return tok["access_token"]

    body = urllib.parse.urlencode({
        "client_id": tok["client_id"],
        "client_secret": tok["client_secret"],
        "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    fresh = json.load(urllib.request.urlopen(req))
    tok["access_token"] = fresh["access_token"]
    tok["expiry_date"] = int((time.time() + fresh["expires_in"]) * 1000)
    CLASPRC.write_text(json.dumps(rc, indent=2), encoding="utf-8")
    print("[clasp-prune] token di-refresh")
    return tok["access_token"]


def api(url, token, method="GET", payload=None):
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    return json.load(urllib.request.urlopen(req))


def main():
    apply_ = "--apply" in sys.argv
    force = "--force" in sys.argv

    cfg = ACTIVE / ".clasp.json"
    if not cfg.exists():
        die(f"{cfg} tidak ada.")
    script_id = json.loads(cfg.read_text(encoding="utf-8"))["scriptId"]

    local = {p.stem for p in ACTIVE.iterdir()
             if p.is_file() and p.suffix in PUSHABLE and not p.name.startswith(".")}
    if len(local) < MIN_LOCAL_FILES:
        die(f"hanya {len(local)} berkas lokal terdeteksi di {ACTIVE} - "
            "menolak jalan agar tidak mengosongkan remote.")

    token = access_token()
    content = api(f"https://script.googleapis.com/v1/projects/{script_id}/content", token)
    remote = [f["name"] for f in content["files"]]

    stale = [n for n in remote if n not in local]
    if not stale:
        print(f"[clasp-prune] remote bersih - {len(remote)} berkas, tidak ada yang usang.")
        return

    print(f"[clasp-prune] berkas usang di remote ({len(stale)}):")
    for n in stale:
        print(f"    - {n}")

    if not apply_:
        print("[clasp-prune] dry-run. Jalankan dengan --apply untuk menghapus.")
        return
    if len(stale) > MAX_DELETIONS and not force:
        die(f"{len(stale)} berkas akan dihapus (batas {MAX_DELETIONS}). "
            "Tambahkan --force kalau memang disengaja.")

    keep = [f for f in content["files"] if f["name"] in local]
    res = api(f"https://script.googleapis.com/v1/projects/{script_id}/content",
              token, method="PUT", payload={"files": keep})
    print(f"[clasp-prune] selesai - remote kini {len(res['files'])} berkas.")


if __name__ == "__main__":
    main()
