#!/usr/bin/env python3
"""
MedMatch — clinical-jobs gate.

This is a healthcare board: non-clinical postings (hotel operators,
drivers, cashiers…) that slip past the collector get dropped here.
Runs AFTER the collector in the weekly sync, and also cleans the
jobs already sitting in data.js.

Rule per job:
  1. title matches the junk blacklist          -> DROP
  2. title/profession/description looks clinical (EN + AR) -> KEEP
  3. collector already classified it to a known profession -> KEEP
  4. otherwise                                 -> DROP

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
    r"|سائق|نادل|طباخ|كاشير|عامل نظافة|حارس|لحام|كهربائي|سباك", re.I)

CLINICAL_RE = re.compile(
    r"doctor|physician|medical officer|general practitioner|طبيب|ممارس|مقيم|استشاري|consultant"
    r"|specialist|أخصائي|nurs|تمريض|ممرض|pharmac|صيدل|dent|أسنان|physio|علاج طبيعي"
    r"|radiolog|أشعة|laborator|مختبر|\blab\b|technician|technologist|فني|midwi|قابل"
    r"|anesth|تخدير|paramedic|إسعاف|optometr|بصريات|nutrition|تغذية|dietitian"
    r"|psycholog|نفسي|therap|علاج|speech|نطق|occupational|health|صحة|صحي|medical|طبي"
    r"|clinic|عيادة|hospital|مستشفى|surgeon|جراح|cardio|قلب|pediatric|أطفال"
    r"|oncolog|سرطان|dermat|جلدية|ophthalm|عيون|orthoped|عظام|gynec|نساء|urolog|مسالك"
    r"|nephro|كلى|gastro|neurol|أعصاب|psychiat|\bicu\b|\ber\b|emergency medicine"
    r"|intensive care|عناية|epidemiolog|وبائ|public health|صحة عامة"
    r"|infection control|مكافحة عدوى|vaccin|تطعيم|لقاح", re.I)

KNOWN_PROFESSIONS = {"general practitioner", "specialist", "consultant", "dentist",
                     "nurse", "pharmacist", "physiotherapist", "radiologist",
                     "laboratory", "healthcare administrator"}


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
    prof = (job.get("profession") or "").strip().lower()
    blob = title + " " + (job.get("profession") or "") + " " + (job.get("description") or "")
    if JUNK_RE.search(title):
        return False
    if CLINICAL_RE.search(blob):
        return True
    if prof in KNOWN_PROFESSIONS:
        return True
    return False


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
