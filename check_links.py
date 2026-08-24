#!/usr/bin/env python3
"""
MedMatch — dead-link pruning for aggregated job postings.

Reads data.js, HEAD-checks every job's applyUrl, and rewrites data.js
with dead jobs removed. A URL is only convicted after failing BOTH a
HEAD and a GET check (many job boards block HEAD), and only on a
genuine 404/410 or a dead domain — never on timeouts, 403s, or 429s,
which usually mean bot protection rather than an expired posting.

Usage:
    python check_links.py              # check + rewrite data.js
    python check_links.py --dry-run    # report only, change nothing

Exit code is always 0 for dry-run; 0 after a successful rewrite.
Designed to run inside GitHub Actions (see linkcheck.yml).
"""
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_FILE = "data.js"
TIMEOUT = 15
MAX_WORKERS = 10
RETRIES = 2
PAUSE_BETWEEN_RETRIES = 3  # seconds

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

CTX = ssl.create_default_context()
# Some job boards have old TLS stacks; don't let handshake quirks kill a live link.
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def load_jobs(path):
    """Extract the DEMO_JOBS array from data.js without executing JS."""
    src = open(path, encoding="utf-8").read()
    m = re.search(r"const DEMO_JOBS\s*=\s*(\[.*?\]);", src, re.S)
    if not m:
        raise SystemExit("ERROR: could not find 'const DEMO_JOBS = [...]' in " + path)
    return src, json.loads(m.group(1))


def probe(url, method):
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None  # timeout, DNS failure, TLS error, connection reset...


def check(url):
    """
    Returns (status, verdict):
      verdict 'live'  -> keep the job
      verdict 'dead'  -> remove the job (proven 404/410 or dead domain)
      verdict 'unknown' -> keep the job (bot-block, timeout, rate limit)
    """
    if not re.match(r"^https?://", url or ""):
        return (None, "live")  # demo jobs have no real URL — never prune these
    for attempt in range(RETRIES):
        code = probe(url, "HEAD")
        if code in (405, 501) or code is None:
            code = probe(url, "GET")  # HEAD unsupported or blocked — try GET
        if code is None:
            # Could be a dead domain OR a flaky network. Retry once before judging.
            if attempt + 1 < RETRIES:
                time.sleep(PAUSE_BETWEEN_RETRIES)
                continue
            return (None, "unknown")
        if code in (404, 410):
            return (code, "dead")
        if code in (403, 429):
            return (code, "unknown")  # bot protection / rate limit — not proof of death
        if 200 <= code < 400:
            return (code, "live")
        # 5xx and odd codes: server having a bad day, not necessarily a dead posting
        return (code, "unknown")
    return (None, "unknown")


def main():
    dry_run = "--dry-run" in sys.argv
    src, jobs = load_jobs(DATA_FILE)
    print("Loaded %d jobs from %s" % (len(jobs), DATA_FILE))

    # Unique real URLs only — many jobs share none, but don't double-hit duplicates.
    urls = sorted({j.get("applyUrl", "") for j in jobs if j.get("applyUrl")})
    print("Checking %d unique apply URLs (HEAD then GET fallback)..." % len(urls))

    verdicts = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(check, u): u for u in urls}
        done = 0
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                verdicts[u] = fut.result()
            except Exception:
                verdicts[u] = (None, "unknown")
            done += 1
            code, v = verdicts[u]
            print("  [%d/%d] %-7s %s  %s" % (done, len(urls), v, code or "---", u[:90]))

    dead_urls = {u for u, (c, v) in verdicts.items() if v == "dead"}
    unknown = sum(1 for c, v in verdicts.values() if v == "unknown")
    live = sum(1 for c, v in verdicts.values() if v == "live")

    kept = [j for j in jobs if j.get("applyUrl", "") not in dead_urls]
    dropped = [j for j in jobs if j.get("applyUrl", "") in dead_urls]

    print("\n=== RESULT ===")
    print("live: %d | dead: %d | unknown(kept): %d" % (live, len(dead_urls), unknown))
    for j in dropped:
        print("  DROP  %s — %s (%s)" % (j.get("id"), j.get("title"), j.get("applyUrl")))

    if dry_run:
        print("\nDry run — data.js unchanged.")
        return

    if not dropped:
        print("\nNo dead links. data.js unchanged.")
        return

    # Rewrite data.js: replace the DEMO_JOBS array, keep everything else byte-identical.
    new_array = json.dumps(kept, ensure_ascii=False, indent=2)
    new_src = re.sub(
        r"const DEMO_JOBS\s*=\s*\[.*?\];",
        "const DEMO_JOBS = " + new_array + ";",
        src, count=1, flags=re.S,
    )
    # Stamp the prune in the header comment if one exists.
    stamp = "/* Last link-check: %s — removed %d dead posting(s). */" % (
        time.strftime("%Y-%m-%d"), len(dropped))
    new_src = re.sub(r"/\* Last link-check:.*?\*/\n?", "", new_src)
    new_src = stamp + "\n" + new_src

    open(DATA_FILE, "w", encoding="utf-8").write(new_src)
    print("\nRewrote %s: %d jobs kept, %d removed." % (DATA_FILE, len(kept), len(dropped)))


if __name__ == "__main__":
    main()
