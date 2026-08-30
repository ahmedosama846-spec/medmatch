#!/usr/bin/env python3
"""
MedMatch — clinical-jobs gate (v2).

This is a healthcare board: non-clinical postings (sales territory
leads, veterinarians, hotel operators, postdocs…) get dropped here.
Runs AFTER the collector/scraper in the weekly pipelines, and also
cleans the jobs already sitting in data.js.

Rule per job:
  1. title matches the junk blacklist                       -> DROP
  2. title or description contains a clinical term (EN+AR)  -> KEEP
  3. otherwise                                              -> DROP

Note: the profession field is deliberately NOT evidence — the
collector defaults it, so a mis-tag would otherwise justify itself.

Usage:
    python filter_jobs.py             # filter + rewrite data.js
    python filter_jobs.py --dry-run   # report only
"""
import json
import re
import subprocess
import sys

DATA_FILE = "data.js"

try:
    import json5
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "json5"])
    import json5

JUNK_RE = re.compile(
    r"telephon|call\s*cent|concierge|swiss service|waiter|waitress|\bchef\b|\bcook\b"
    r"|driver|chauffeur|cashier|housekeep|security guard|barista|valet|bell\s?(hop|boy)"
    r"|storekeep|warehouse|cleaner|janitor|gardener|electrician|plumber"
    r"|territory|\bsales\b|account (manager|executive)|business development"
    r"|livestock|veterinar|postdoctoral|research fellow"
    r"|مبيعات|تسويق|سائق|نادل|طباخ|كاشير|عامل نظافة|حارس|لحام|كهربائي|سباك", re.I)

CLINICAL_RE = re.compile(
    r"doctor|physician|medical officer|general practitioner|طبيب|ممارس|مقيم|resident|house officer"
    r"|استشاري|consultant|specialist|أخصائي|nurs|تمريض|ممرض|pharmac|صيدل|dent|أسنان"
    r"|physio|علاج طبيعي|radiolog|أشعة|laborator|مختبر|\blab\b|technician|technologist|فني"
    r"|midwi|قابل|anesth|تخدير|paramedic|إسعاف|optometr|بصريات|nutrition|تغذية|dietitian"
    r"|psycholog|نفسي|therap|علاج|speech|نطق|occupational|health|صحة|صحي|medical|طبي"
    r"|clinic|عيادة|hospital|مستشفى|surgeon|جراح|cardio|قلب|pediatric|أطفال"
    r"|oncolog|سرطان|dermat|جلدية|ophthalm|عيون|orthoped|عظام|gynec|نساء|urolog|مسالك"
    r"|nephro|كلى|gastro|neurol|أعصاب|psychiat|\bicu\b|\ber\b|emergency|طوارئ"
    r"|intensive care|عناية|epidemiolog|وبائ|public health|صحة عامة"
    r"|infection control|مكافحة عدوى|vaccin|تطعيم|لقاح", re.I)


def read_const(src, name):
    m = re.search(r"const %s\s*=\s*(\[.*?\]);" % name, src, re.S)
    if not m:
        return None
    text = m.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json5.loads(text)


def write_const(src, name, arr):
    return re.sub(r"const %s\s*=\s*\[.*?\];" % name,
                  "const %s = %s;" % (name, json.dumps(arr, ensure_ascii=False, indent=2)),
                  src, count=1, flags=re.S)


def verdict(job):
    title = job.get("title") or ""
    if JUNK_RE.search(title):
        return False
    blob = title + " " + (job.get("description") or "")
    return bool(CLINICAL_RE.search(blob))


def main():
    dry = "--dry-run" in sys.argv
    src = open(DATA_FILE, encoding="utf-8").read()
    jobs = read_const(src, "DEMO_JOBS")
    if jobs is None:
        raise SystemExit("ERROR: DEMO_JOBS not found in " + DATA_FILE)

    kept, dropped = [], []
    for j in jobs:
        (kept if verdict(j) else dropped).append(j)

    print("Clinical gate — kept %d, dropped %d of %d" % (len(kept), len(dropped), len(jobs)))
    for j in dropped:
        print("  DROP  %s — %s [%s]" % (j.get("id"), j.get("title"), j.get("profession") or "?"))

    if dry:
        print("\nDry run — data.js unchanged.")
        return
    if dropped:
        open(DATA_FILE, "w", encoding="utf-8").write(write_const(src, "DEMO_JOBS", kept))
        print("\ndata.js updated.")
    else:
        print("\nNothing to drop — data.js unchanged.")


if __name__ == "__main__":
    main()
