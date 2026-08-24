#!/usr/bin/env python3
"""
MedMatch — Health Holding cluster portal scraper.

Scrapes the 20 Saudi health-cluster recruitment portals
(<cluster>-careers.health.sa — one shared platform) and merges the
postings into data.js as employer-direct jobs:
  source = "Health Cluster (Direct)", applyIsDirect = true, demo = false.

Strategy per portal (first one that yields jobs wins):
  1. JSON API guesses   (/api/jobs, /jobs.json, ...)
  2. JSON-LD JobPosting blocks embedded in the HTML
  3. Anchor heuristics  (links that look like job postings)

Safety rules:
  - A cluster that returns 0 jobs keeps its previous listings
    (protects against parser breakage wiping good data).
  - Duplicates are detected by applyUrl.
  - Never crashes the run: per-cluster try/except with diagnostics.

Usage:
    pip install requests beautifulsoup4
    python scrape_cluster.py             # scrape + rewrite data.js
    python scrape_cluster.py --dry-run   # report only
"""
import hashlib
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request

DATA_FILE = "data.js"
TIMEOUT = 25
PAUSE = 1.5  # seconds between clusters — be polite

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# slug -> (display name, default city from the MedMatch CITIES list)
CLUSTERS = {
    "riyadh1":         ("Riyadh First Health Cluster", "Riyadh"),
    "riyadh2":         ("Riyadh Second Health Cluster", "Riyadh"),
    "riyadh3":         ("Riyadh Third Health Cluster", "Riyadh"),
    "jeddah1":         ("Jeddah First Health Cluster", "Jeddah"),
    "jeddah2":         ("Jeddah Second Health Cluster", "Jeddah"),
    "makkah":          ("Makkah Health Cluster", "Mecca"),
    "madinah":         ("Madinah Health Cluster", "Medina"),
    "eastern":         ("Eastern Province Health Cluster", "Dammam"),
    "alqassim":        ("Qassim Health Cluster", "Qassim"),
    "alahsa":          ("Al Ahsa Health Cluster", "Al Ahsa"),
    "aseer":           ("Aseer Health Cluster", "Abha"),
    "tabuk":           ("Tabuk Health Cluster", "Tabuk"),
    "altaif":          ("Taif Health Cluster", "Other"),
    "hail":            ("Hail Health Cluster", "Other"),
    "aljouf":          ("Al Jouf Health Cluster", "Other"),
    "northernborders": ("Northern Borders Health Cluster", "Other"),
    "jazan":           ("Jazan Health Cluster", "Other"),
    "najran":          ("Najran Health Cluster", "Other"),
    "albaha":          ("Al Baha Health Cluster", "Other"),
    "hafralbatin":     ("Hafr Al Batin Health Cluster", "Other"),
}

# ---------- classification (Arabic + English titles) ----------
PROF_RULES = [
    ("Dentist",        r"أسنان|dent"),
    ("Nurse",          r"تمريض|ممرض|nurs"),
    ("Pharmacist",     r"صيدل|pharmac"),
    ("Physiotherapist", r"علاج طبيعي|physiotherap|physical therap"),
    ("Radiologist",    r"أشعة|radiolog"),
    ("Laboratory",     r"مختبر|laborator|\blab\b|فني مختبر"),
    ("Healthcare Administrator", r"إداري|إدارة|مدير|admin|manager|director|موارد بشرية|محاسب|مالي"),
    ("Consultant",     r"استشاري|consultant"),
    ("Specialist",     r"أخصائي|specialist|نائب|registrar"),
    ("General Practitioner", r"طبيب|ممارس|مقيم|physician|doctor|\bgp\b|medical officer|resident"),
]

def classify_profession(title):
    t = (title or "").lower()
    for prof, pat in PROF_RULES:
        if re.search(pat, t, re.I):
            return prof
    return "Other"

CLINICAL = {"General Practitioner", "Specialist", "Consultant", "Dentist",
            "Nurse", "Pharmacist", "Physiotherapist", "Radiologist", "Laboratory"}

# ---------- fetching ----------
def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/json,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as r:
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None

def abs_url(href, base):
    if not href:
        return ""
    if href.startswith("http"):
        return href
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        return base + href
    return base + "/" + href

# ---------- parsing strategies ----------
def parse_api_json(obj, base):
    """Handle common job-API shapes."""
    if isinstance(obj, dict):
        for k in ("jobs", "data", "content", "results", "items", "postings"):
            if isinstance(obj.get(k), list):
                obj = obj[k]
                break
    if not isinstance(obj, list):
        return []
    out = []
    for it in obj:
        if not isinstance(it, dict):
            continue
        title = it.get("title") or it.get("name") or it.get("jobTitle") or it.get("position") or ""
        url = (it.get("url") or it.get("applyUrl") or it.get("link") or it.get("applyLink") or "")
        if isinstance(url, dict):
            url = url.get("url") or ""
        desc = it.get("description") or it.get("summary") or ""
        if isinstance(desc, str):
            desc = re.sub(r"<[^>]+>", " ", desc).strip()[:500]
        title = str(title).strip()
        if title and (url or True):
            out.append({"title": title, "url": abs_url(str(url), base), "desc": desc})
    return out

def parse_jsonld(html, base):
    out = []
    for m in re.finditer(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                         html, re.S | re.I):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:
            continue
        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            if data.get("@type") == "JobPosting":
                items = [data]
            elif isinstance(data.get("@graph"), list):
                items = data["@graph"]
            elif isinstance(data.get("itemListElement"), list):
                items = [e.get("item", e) for e in data["itemListElement"]]
        for it in items:
            if not isinstance(it, dict) or it.get("@type") != "JobPosting":
                continue
            title = (it.get("title") or "").strip()
            url = it.get("url") or ""
            desc = re.sub(r"<[^>]+>", " ", str(it.get("description") or "")).strip()[:500]
            if title:
                out.append({"title": title, "url": abs_url(str(url), base), "desc": desc})
    return out

NAV_WORDS = re.compile(r"home|about|contact|login|sign|privacy|terms|search|menu|"
                       r"الرئيسية|حول|اتصل|دخول|خصوصية|شروط|بحث", re.I)

def parse_links(html, base):
    if not BeautifulSoup:
        return []
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
        if not (5 <= len(text) <= 120):
            continue
        if NAV_WORDS.search(text):
            continue
        if not re.search(r"job|position|vacanc|career|apply|posting|وظيف|تقديم", href, re.I):
            continue
        url = abs_url(href, base)
        if url in seen:
            continue
        seen.add(url)
        out.append({"title": text, "url": url, "desc": ""})
    return out

# ---------- scrape one cluster ----------
def scrape_cluster(slug):
    name, city = CLUSTERS[slug]
    base = "https://%s-careers.health.sa" % slug

    for path in ("/api/jobs", "/jobs.json", "/api/v1/jobs", "/api/careers/jobs",
                 "/careers/api/jobs", "/api/jobpostings"):
        txt = fetch(base + path)
        if txt and txt.lstrip()[:1] in "[{":
            try:
                jobs = parse_api_json(json.loads(txt), base)
            except Exception:
                jobs = []
            if jobs:
                return jobs, "api " + path

    for path in ("", "/", "/jobs", "/careers", "/ar", "/en", "/ar/jobs", "/en/jobs"):
        html = fetch(base + path)
        if not html:
            continue
        jobs = parse_jsonld(html, base)
        if jobs:
            return jobs, "jsonld " + (path or "/")
        jobs = parse_links(html, base)
        if jobs:
            return jobs, "links " + (path or "/")

    return [], "no jobs found"

def mk_job(slug, raw):
    name, city = CLUSTERS[slug]
    title = raw["title"]
    url = raw["url"] or ("https://%s-careers.health.sa" % slug)
    jid = "hc-" + slug + "-" + hashlib.md5(url.encode()).hexdigest()[:8]
    prof = classify_profession(title)
    clinical = prof in CLINICAL
    return {
        "id": jid,
        "title": title,
        "profession": prof,
        "specialty": "",
        "employer": name,
        "city": city,
        "salaryMin": 0,
        "salaryMax": 0,
        "expMin": 0,
        "expMax": 5,
        "degreeReq": "",
        "scfhs": "required" if clinical else "not_specified",
        "dataflow": "not_specified",
        "saudiExp": "not_specified",
        "gender": "Not specified",
        "employment": "Full-time",
        "contract": "",
        "hours": "",
        "skills": [],
        "certs": [],
        "requirements": (["Valid SCFHS classification/registration"] if clinical else []),
        "responsibilities": [],
        "description": raw.get("desc") or
            ("%s — public-sector role at %s. Apply directly via the cluster's recruitment portal."
             % (title, name)),
        "source": "Health Cluster (Direct)",
        "applyUrl": url,
        "applyIsDirect": True,
        "postedDaysAgo": 0,
        "demo": False,
    }

# ---------- data.js I/O ----------
def read_const(src, name):
    m = re.search(r"const %s\s*=\s*(\[.*?\]);" % name, src, re.S)
    return json.loads(m.group(1)) if m else None

def write_const(src, name, arr):
    return re.sub(r"const %s\s*=\s*\[.*?\];" % name,
                  "const %s = %s;" % (name, json.dumps(arr, ensure_ascii=False, indent=2)),
                  src, count=1, flags=re.S)

def main():
    dry = "--dry-run" in sys.argv
    src = open(DATA_FILE, encoding="utf-8").read()
    jobs = read_const(src, "DEMO_JOBS")
    sources = read_const(src, "JOB_SOURCES")
    if jobs is None:
        raise SystemExit("ERROR: DEMO_JOBS not found in " + DATA_FILE)

    print("Scraping %d cluster portals...\n" % len(CLUSTERS))
    fresh = {}   # slug -> [job, ...]
    for slug in CLUSTERS:
        try:
            raw, how = scrape_cluster(slug)
        except Exception as e:
            raw, how = [], "error: %s" % e
        fresh[slug] = [mk_job(slug, r) for r in raw]
        print("  %-16s %3d jobs   (%s)" % [slug, len(raw), how])
        time.sleep(PAUSE)

    # merge: keep non-cluster jobs; per cluster, replace only when we got fresh data
    kept = [j for j in jobs if not str(j.get("id", "")).startswith("hc-")]
    total_new = 0
    for slug, new_jobs in fresh.items():
        old = [j for j in jobs if str(j.get("id", "")).startswith("hc-" + slug + "-")]
        if new_jobs:
            kept.extend(new_jobs)
            total_new += len(new_jobs)
        else:
            kept.extend(old)  # parser/portal failed — keep what we had

    if sources is not None:
        entry = {"id": "src-clusters", "name": "Health Clusters (Direct)",
                 "url": "https://www.health.sa/en/careers", "type": "Employer portals",
                 "api": "HTML/JSON scrape", "lastSync": time.strftime("%Y-%m-%d %H:%M"),
                 "imported": total_new, "active": total_new > 0}
        sources = [s for s in sources if s.get("id") != "src-clusters"] + [entry]
        src = write_const(src, "JOB_SOURCES", sources)

    src = write_const(src, "DEMO_JOBS", kept)

    print("\n=== RESULT ===")
    print("cluster jobs this run: %d | total jobs in data.js: %d" % (total_new, len(kept)))
    if dry:
        print("Dry run — data.js unchanged.")
        return
    open(DATA_FILE, "w", encoding="utf-8").write(src)
    print("data.js updated.")

if __name__ == "__main__":
    main()
