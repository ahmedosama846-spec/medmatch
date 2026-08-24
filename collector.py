#!/usr/bin/env python3
"""
MedMatch - live job collector (multi-source: Jooble + JSearch)
==============================================================
Pulls REAL healthcare jobs from TWO APIs and merges them:

  * Jooble   - big Gulf coverage (key from https://sa.jooble.org/api/about)
  * JSearch  - reads Google for Jobs, which includes LinkedIn-originated
               postings (free Basic plan via RapidAPI:
               https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing)

v4.8: Job Details enrichment. After collection, the script calls JSearch's
Job Details endpoint for the top doctor-level matches (--details N, default
10). Details include extra application options - so employer-direct apply
links replace aggregator links where they exist - plus fuller descriptions
and structured requirements/responsibilities.

Also: country flag, medical-insurance roles, employer-direct link
preference, endpoint auto-detection, "via linkedin" passes, defensive
parsing, clinical-only filter, rank classification, 30-day freshness.

Run with either key or both (in the folder that contains data.js):
  python collector.py --key YOUR_JOOBLE_KEY --rapid-key YOUR_RAPIDAPI_KEY

Options:
  --data PATH       path to data.js (default: data.js in current folder)
  --country CODE    ISO country code to collect from (default: sa)
  --host HOST       Jooble domain (default: derived from --country)
  --pages N         pages per search term per source (default: 2)
  --details N       enrich the top N doctor-level jobs with Job Details
                    (default: 10; 0 disables; costs N extra JSearch requests)
  --max-age N       only keep jobs posted in the last N days (default: 30)
  --query "term"    add your own search term (repeatable)
  --keep-demo       keep the 20 demo jobs and append live jobs after them
  --doctors-only    keep only physician-level roles (GP/specialist/consultant)

Note: a full two-source run uses ~75-90 JSearch requests (free: 200/month).
"""

import argparse
import datetime
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

MAX_JOB_AGE_DAYS = 30
JSEARCH_HOST = "jsearch.p.rapidapi.com"
JSEARCH_BASE = "https://" + JSEARCH_HOST
JSEARCH_CANDIDATE_PATHS = ["/search-v2", "/search", "/job-search"]
JSEARCH_DETAILS_PATHS = ["/job-details-v2", "/job-details", "/jobdetails"]

COUNTRY_NAMES = {
    "sa": "Saudi Arabia", "ae": "United Arab Emirates", "qa": "Qatar",
    "kw": "Kuwait", "bh": "Bahrain", "om": "Oman", "eg": "Egypt",
    "jo": "Jordan", "sd": "Sudan", "iq": "Iraq", "ye": "Yemen",
}

DEFAULT_QUERIES = [
    "general practitioner", "family medicine physician", "medical officer",
    "physician", "specialist physician", "consultant physician", "doctor",
    "staff nurse", "nurse", "pharmacist", "dentist", "physiotherapist",
    "radiologist", "medical laboratory technologist", "hospital",
    # specialty terms - each one is up to 10 more JSearch results
    "internal medicine", "cardiology", "pediatrics", "emergency medicine",
    "dermatology", "obstetrics gynecology", "general surgery", "icu nurse",
    "emergency room doctor", "family medicine",
    # medical insurance / pre-authorization roles
    "medical approval", "pre-authorization medical", "medical claims reviewer",
    "insurance medical officer",
]

# Extra JSearch passes that explicitly pull LinkedIn-published jobs.
LINKEDIN_QUERIES = ["general practitioner", "physician", "medical officer", "staff nurse"]

# --- apply-link quality ------------------------------------------------------
AGGREGATOR_HOSTS = ("linkedin.", "indeed.", "glassdoor.", "ziprecruiter.",
                    "jooble.", "jobleads.", "bebee.", "neuvoo.", "talent.",
                    "careerjet.", "monster.", "simplyhired.", "google.",
                    "bayt.", "gulftalent.", "naukrigulf.", "foundit",
                    "drjobs.", "olivegulf.", "jobs77.", "jobrapido.")
ATS_HOST_HINTS = ("workday", "successfactors", "greenhouse", "lever.co",
                  "taleo", "icims", "smartrecruiters", "zoho", "bamboohr",
                  "oraclecloud", "dayforce", "ashby", "workable", "recruitee",
                  "teamtailor", "applicantpro", "paylocity", "ultipro",
                  "hirebridge", "jobvite", "breezy", "recruiterbox")


def host_of(url):
    try:
        return urllib.parse.urlparse(url).netloc.lower()
    except Exception:
        return ""


def best_apply_link(default_link, options):
    """Pick the most employer-direct apply link available."""
    cands = []
    for o in (options or []):
        if isinstance(o, dict):
            u = o.get("apply_link") or o.get("apply_url") or o.get("link") or o.get("url")
            direct = bool(o.get("is_direct") or o.get("direct") or o.get("apply_is_direct"))
            if u:
                cands.append((u, direct))
    if default_link:
        cands.append((default_link, False))
    if not cands:
        return "", False
    for u, d in cands:
        if d:
            return u, True
    for u, _ in cands:
        h = host_of(u)
        if any(a in h for a in ATS_HOST_HINTS) and not any(g in h for g in AGGREGATOR_HOSTS):
            return u, True
    for u, _ in cands:
        h = host_of(u)
        if h and not any(g in h for g in AGGREGATOR_HOSTS):
            return u, False
    return cands[0][0], False


# --- clinical relevance filter ----------------------------------------------
CLINICAL_ROLE_RE = re.compile(r"""
\b(doctor|physician|practitioner|medical officer|health officer|clinician|
nurse|nursing|midwif|pharmacist|dentist|dental|surgeon|radiolog|radiograph|
sonograph|physiotherap|physical therap|occupational therap|speech therap|
respiratory therap|laborator|phlebotom|paramedic|emt|optometr|dietitian|
nutritionist|anesthe|patholog|pharmacolog|psychiatr|psycholog|therapist|
biomedical|cardiolog|dermatolog|pediatric|paediatric|obstetr|gyna?ec|
oncolog|urolog|nephrolog|gastroenterolog|endocrinolog|pulmonolog|neurolog|
ophthalmolog|orthopa?edic|intensivist|hematolog|epidemiolog|endoscop|
scrub (nurse|tech)|cssd|x-?ray|mammograph|echo tech|operation theat|
pre-?authoriz|preauth|medical approval|medical reviewer|prior auth|
claims (reviewer|officer|analyst|specialist)|utilization (review|management))\b""", re.I | re.X)

EXCLUDE_ROLE_RE = re.compile(r"""
\b(sales|accountant|accounting|marketing|driver|chauffeur|software|
developer|programmer|engineer|data entry|waiter|waitress|chef|cook|barista|
teacher|tutor|lecturer|hr|human resources|recruiter|finance|financial|
auditor|legal|lawyer|attorney|real estate|construction|foreman|mechanic|
electrician|plumber|welder|security|cleaner|housekeep|receptionist|
secretary|customer service|call center|cashier|retail|warehouse|logistics|
supply chain|procurement|merchandis|graphic|journalist|editor|translator|
interpreter|veterinar|vet|farm|agricultur|beautician|barber|steward|
cabin crew|flight attendant|safety officer|qa qc|quality engineer)\b""", re.I | re.X)

MEDICAL_RE = re.compile(r"""
\b(doctor|physician|practitioner|medic|medical|medicine|clinic|clinical|
hospital|health ?care|nurse|nursing|midwif|pharmac|dent|orthodont|endodont|
prosthodont|periodont|surgeon|surgical|radiolog|sonograph|ultrasound|x-?ray|
laborator|patholog|histolog|hematolog|microbiolog|biochem|blood bank|
physiotherap|physical therap|occupational therap|speech therap|
respiratory therap|dialysis|optometr|ophthalm|orthop|pediatric|paediatric|
obstetr|gynec|gynaec|anesthe|anaesthe|cardiolog|dermatolog|neurolog|
psychiatr|urolog|nephrolog|gastroenter|endocrin|pulmon|oncolog|rheumat|
geriatr|intensiv|critical care|icu|emergency (medicine|department|room)|
paramedic|ambulance|emt|phlebotom|ecg|epidemiolog|public health|
infection control|dietitian|nutritionist|patient care|home care|
telemedicine|vaccination|radiographer|mammograph|cssd|mortuary|endoscop|
forensic med|mbbs|bds|bpharm|pharmd|bsn|mrcgp|mrcp|frcs|scfhs|prometric|
dataflow|gp doctor|general practitioner|pre-?authoriz|medical approval|
claims review|utilization review)\b""", re.I | re.X)

DOCTOR_TITLE_RE = re.compile(r"""
\b(doctor|physician|practitioner|medical officer|health officer|clinician|
surgeon|internist|hospitalist|resident|house officer|gp|medic)\b|
\b(cardiolog|dermatolog|pediatric|paediatric|obstetric|gyna?ecolog|
anesthe|anaesthe|radiolog|oncolog|urolog|nephrolog|gastroenterolog|
endocrinolog|pulmonolog|neurolog|ophthalmolog|orthopa?edic|psychiatr|
patholog|hematolog|intensivist|emergency medicine|critical care|
family medicine|general medicine|internal medicine|general surgery)""", re.I | re.X)

DOCTOR_CONTEXT_RE = re.compile(r"\b(consultant|specialist|registrar)\b", re.I)

INSURANCE_RE = re.compile(r"pre-?authoriz|preauth|medical approval|prior auth|"
                          r"claims (reviewer|officer|analyst|specialist)|"
                          r"utilization (review|management)|medical insurance|"
                          r"insurance (medical|officer|reviewer)", re.I)


def is_clinical_job(title, desc):
    if CLINICAL_ROLE_RE.search(title):
        return True
    if EXCLUDE_ROLE_RE.search(title):
        return False
    return bool(MEDICAL_RE.search(title) or MEDICAL_RE.search(desc))


def is_doctor_job(title, desc):
    if DOCTOR_TITLE_RE.search(title):
        return True
    if DOCTOR_CONTEXT_RE.search(title) and MEDICAL_RE.search(title + " " + desc):
        return True
    return False


# --- vocabularies mirrored from your data.js / engine.js -------------------
CITIES = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Mecca", "Medina",
          "Abha", "Tabuk", "Al Ahsa", "Qassim"]

# IMPORTANT: seniority ranks are checked BEFORE the GP keywords, because
# titles like "Consultant Family Medicine" are NOT GP-rank jobs.
PROF_KEYS = [
    (r"\b(consultant|sr\.? consultant|senior consultant|assistant consultant|associate consultant)\b", "Consultant"),
    (r"\b(specialist|registrar)\b", "Specialist"),
    (r"\b(general practitioner|general physician|gp doctor|gp|family medicine|family doctor|primary care physician|medical officer|hospitalist|medical doctor|doctor|physician|resident|house officer|duty doctor)\b", "General Practitioner"),
    (r"dentist|dental|\bbds\b|orthodont|endodont", "Dentist"),
    (r"nurse|nursing|\brn\b", "Nurse"),
    (r"pharmacist|pharmacy|\bpharmd\b|\bbpharm\b", "Pharmacist"),
    (r"physiotherap|physical therap", "Physiotherapist"),
    (r"radiolog", "Radiologist"),
    (r"laborator|lab technolog|medical technolog|\bmlt\b", "Laboratory"),
    (r"healthcare admin|hospital admin|clinic manager|operations manager", "Healthcare Administrator"),
]

SPECIALTIES = ["Cardiology", "Dermatology", "Internal Medicine", "Pediatrics",
               "Emergency Medicine", "Orthodontics", "Critical Care", "General Practice",
               "Family Medicine", "Radiology", "Obstetrics", "Surgery", "Orthopedics",
               "ENT", "Ophthalmology", "Psychiatry", "Anesthesia", "Urology",
               "Nephrology", "Gastroenterology", "Endocrinology", "Pulmonology",
               "Neurology", "Oncology"]

SKILLS_VOCAB = ["Emergency Medicine", "OPD", "Chronic Disease Management", "Minor Surgery",
                "Acute Care", "Primary Care", "Triage", "Wound Care", "Diabetes Management",
                "Hypertension Management", "Pediatric Care", "Geriatric Care", "Vaccination",
                "Health Screening", "Patient Education", "ICU", "Critical Care",
                "Ventilator Management", "Central Line Care", "Medication Administration",
                "IV Therapy", "Phlebotomy", "ECG Interpretation", "Radiology Reporting",
                "CT", "MRI", "Ultrasound", "Dispensing", "Medication Review",
                "Clinical Pharmacy", "Pharmacovigilance", "Compounding",
                "Restorative Dentistry", "Endodontics", "Orthodontics", "Oral Surgery",
                "Prosthodontics", "Scaling and Polishing", "Physiotherapy Rehabilitation",
                "Musculoskeletal Assessment", "Sports Injury", "Electrotherapy",
                "Hematology", "Biochemistry", "Microbiology", "Blood Bank",
                "Quality Control", "Infection Control", "Medical Records",
                "Healthcare Management", "Audit", "CBAHI Accreditation", "Telemedicine",
                "Minor Procedures", "Antenatal Care", "Dermatology", "Cardiology",
                "Internal Medicine", "Family Medicine"]

CERTS_VOCAB = ["ACLS", "BLS", "ATLS", "PALS", "NRP", "ALS", "PHTLS", "CME"]

REQ_HINT = re.compile(r"experience|scfhs|licen[cs]e|degree|certif|registration|mbbs|bds|bpharm|pharmd|nursing|prometric|dataflow|board|fellowship", re.I)
RESP_HINT = re.compile(r"responsib|duties|provide|manage|perform|conduct|diagnos|treat|patient care|clinic", re.I)

EMPLOYMENT_MAP = {"FULLTIME": "Full-time", "PARTTIME": "Part-time",
                  "CONTRACTOR": "Contract", "INTERN": "Temporary"}


# --- shared helpers ----------------------------------------------------------
def clean(text):
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_jobs(payload):
    """Normalize a JSearch response into a flat list of job dicts."""
    if not isinstance(payload, dict):
        return []
    items = payload.get("data")
    if items is None:
        items = payload.get("results")
    if isinstance(items, dict):
        if "job_id" in items or "job_title" in items:
            return [items]
        flat = []
        for v in items.values():
            if isinstance(v, list):
                flat.extend(x for x in v if isinstance(x, dict))
        return flat
    if isinstance(items, list):
        return [x for x in items if isinstance(x, dict)]
    return []


def extract_cursor(payload):
    """JSearch v2 pagination cursor - field name varies between versions."""
    if not isinstance(payload, dict):
        return None
    cur = payload.get("cursor") or payload.get("next_cursor") or payload.get("nextCursor")
    if not cur and isinstance(payload.get("meta"), dict):
        cur = payload["meta"].get("cursor") or payload["meta"].get("next_cursor")
    return cur or None


def find_profession(title, desc):
    for pat, prof in PROF_KEYS:
        if re.search(pat, title, re.I):
            return prof
    for pat, prof in PROF_KEYS:
        if re.search(pat, desc, re.I):
            return prof
    return "Other"


def find_specialty(profession, text):
    if profession == "Other" and INSURANCE_RE.search(text):
        return "Medical Insurance"
    for s in SPECIALTIES:
        if re.search(re.escape(s), text, re.I):
            return s
    return "General Practice" if profession == "General Practitioner" else ""


def find_city(location_text, desc):
    hay = (location_text or "") + " " + (desc or "")[:400]
    for c in CITIES:
        if re.search(re.escape(c), hay, re.I):
            return c
    return "Other"


def find_skills(text, api_skills=None):
    found = [s for s in SKILLS_VOCAB
             if re.search(r"\b" + re.escape(s) + r"\b", text, re.I)]
    for s in (api_skills or []):
        for v in SKILLS_VOCAB:
            if v.lower() == str(s).strip().lower() and v not in found:
                found.append(v)
    return found[:8]


def find_certs(text):
    return [c for c in CERTS_VOCAB if re.search(r"\b" + re.escape(c) + r"\b", text, re.I)]


def find_degree_req(text):
    t = text.lower()
    if "mbbs" in t or "medical degree" in t or "doctor of medicine" in t:
        return "MBBS or equivalent medical degree"
    if "bds" in t or "dental degree" in t:
        return "BDS or equivalent"
    if "pharmd" in t or "bpharm" in t or "pharmacy degree" in t:
        return "BPharm/PharmD"
    if "bsc nursing" in t or "nursing degree" in t:
        return "BSc Nursing or equivalent"
    if "physiotherapy" in t or "physical therapy" in t:
        return "BSc Physiotherapy or equivalent"
    if "laboratory" in t or "medical technology" in t:
        return "BSc Medical Laboratory Sciences"
    return ""


def find_experience(text, exp_years=None):
    if exp_years is not None and 0 < exp_years <= 30:
        return int(exp_years), int(exp_years) + 5
    nums = [int(n) for n in re.findall(r"(\d{1,2})\s*\+?\s*(?:years?|yrs?)", text, re.I)]
    nums = [n for n in nums if 0 < n <= 20]
    exp_min = min(nums) if nums else 0
    return exp_min, exp_min + 5


def parse_salary_text(s):
    """Jooble salary is free text, e.g. '15000 - 20000 SAR'."""
    if not s:
        return 0, 0
    nums = [int(x.replace(",", "")) for x in re.findall(r"[\d,]{4,}", s)]
    if re.search(r"year|annual|per yr", s, re.I) and not re.search(r"month", s, re.I):
        nums = [n // 12 for n in nums]
    nums = [n for n in nums if n > 0]
    if len(nums) >= 2:
        return min(nums), max(nums)
    if len(nums) == 1:
        return nums[0], int(nums[0] * 1.2)
    return 0, 0


def monthly_salary(value, period, currency):
    """JSearch salary is numeric with a period + currency."""
    if not value or not currency:
        return 0
    if period == "YEAR":
        return int(round(value / 12.0 / 100.0) * 100)
    if period == "MONTH":
        return int(round(value / 100.0) * 100)
    if period == "WEEK":
        return int(round(value * 4.33 / 100.0) * 100)
    return 0


def sentences(text):
    parts = re.split(r"(?<=[.!?])\s+|[\n\r]+| - ", text)
    return [p.strip(" -\u2022\t") for p in parts if 25 <= len(p.strip()) <= 220]


def posted_days_ago(date_str):
    try:
        dt = datetime.datetime.fromisoformat(str(date_str).split(".")[0].replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return max(0, (datetime.datetime.now(datetime.timezone.utc) - dt).days)
    except Exception:
        return 0


def map_employment_text(t):
    t = (t or "").lower()
    if "part" in t:
        return "Part-time"
    if "contract" in t:
        return "Contract"
    if "temp" in t or "intern" in t:
        return "Temporary"
    return "Full-time"


def licensing_flags(desc):
    low = desc.lower()
    scfhs = "required" if "scfhs" in low and "regist" in low else ("preferred" if "scfhs" in low else "not_specified")
    dataflow = "required" if "dataflow" in low else "not_specified"
    if re.search(r"saudi (arabia )?experience (is )?(required|must)", low):
        saudi_exp = "required"
    elif re.search(r"saudi (arabia )?experience (is )?(preferred|an advantage|a plus)", low):
        saudi_exp = "preferred"
    else:
        saudi_exp = "not_specified"
    return scfhs, dataflow, saudi_exp


def build_job(job_id, title, desc, employer, location_text, sal_min, sal_max,
              employment, apply_url, apply_direct, updated, source,
              api_skills=None, exp_years=None, reqs=None, resps=None):
    text = title + " " + desc
    profession = find_profession(title, desc)
    exp_min, exp_max = find_experience(desc, exp_years)
    scfhs, dataflow, saudi_exp = licensing_flags(desc)
    if not reqs or not resps:
        sents = sentences(desc)
        if not reqs:
            reqs = [s for s in sents if REQ_HINT.search(s)][:5]
        if not resps:
            resps = [s for s in sents if RESP_HINT.search(s) and s not in (reqs or [])][:4]
    if sal_min and not sal_max:
        sal_max = int(sal_min * 1.2)
    if sal_max and not sal_min:
        sal_min = int(sal_max * 0.8)
    return {
        "id": job_id,
        "title": title,
        "profession": profession,
        "specialty": find_specialty(profession, text),
        "employer": employer or "Not specified",
        "city": find_city(location_text, desc),
        "salaryMin": sal_min,
        "salaryMax": sal_max,
        "expMin": exp_min,
        "expMax": exp_max,
        "degreeReq": find_degree_req(desc),
        "scfhs": scfhs,
        "dataflow": dataflow,
        "saudiExp": saudi_exp,
        "gender": "Not specified",
        "employment": employment,
        "contract": "",
        "hours": "",
        "skills": find_skills(text, api_skills),
        "certs": find_certs(text),
        "requirements": (reqs or [])[:5],
        "responsibilities": (resps or [])[:4],
        "description": desc[:600],
        "source": source,
        "applyUrl": apply_url or "",
        "applyIsDirect": bool(apply_direct),
        "postedDaysAgo": posted_days_ago(updated),
        "demo": False,
    }


# --- Jooble ------------------------------------------------------------------
def fetch_jooble(api_key, host, query, page, location):
    url = "https://%s/api/%s" % (host, api_key.strip().strip('"').strip("'"))
    body = json.dumps({
        "keywords": query, "location": location,
        "page": str(page), "companysearch": "false",
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json", "User-Agent": "MedMatchCollector/4.8",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def normalize_jooble(job):
    sal_min, sal_max = parse_salary_text(job.get("salary"))
    link = job.get("link") or ""
    h = host_of(link)
    direct = bool(h and any(a in h for a in ATS_HOST_HINTS)
                  and not any(g in h for g in AGGREGATOR_HOSTS))
    return build_job(
        job_id="jb" + str(job.get("id") or abs(hash(link)))[:24],
        title=clean(job.get("title")),
        desc=clean(job.get("snippet")),
        employer=clean(job.get("company")),
        location_text=job.get("location"),
        sal_min=sal_min,
        sal_max=sal_max,
        employment=map_employment_text(job.get("type")),
        apply_url=link,
        apply_direct=direct,
        updated=job.get("updated", ""),
        source=clean(job.get("source")) or "Jooble (Live)",
    )


# --- JSearch (RapidAPI) with endpoint auto-detection -------------------------
def fetch_jsearch(rapid_key, full_query, path, country, cursor=None):
    if cursor:
        params = {"cursor": cursor}
    else:
        params = {"query": full_query, "country": country,
                  "date_posted": "month", "language": "en",
                  "page": 1, "num_pages": 1}
    url = JSEARCH_BASE + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "X-RapidAPI-Key": rapid_key.strip().strip('"').strip("'"),
        "X-RapidAPI-Host": JSEARCH_HOST,
        "User-Agent": "MedMatchCollector/4.8",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_jsearch_details(rapid_key, path, job_id):
    params = {"job_id": job_id, "country": "sa", "language": "en"}
    url = JSEARCH_BASE + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "X-RapidAPI-Key": rapid_key.strip().strip('"').strip("'"),
        "X-RapidAPI-Host": JSEARCH_HOST,
        "User-Agent": "MedMatchCollector/4.8",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def probe_details_path(rapid_key, sample_job_id):
    """Find the working Job Details endpoint (once per run)."""
    for path in JSEARCH_DETAILS_PATHS:
        try:
            data = fetch_jsearch_details(rapid_key, path, sample_job_id)
            if isinstance(data, dict) and ("data" in data or "results" in data):
                print("Job Details endpoint: %s" % path)
                return path
        except urllib.error.HTTPError as e:
            print("  ! details %s -> HTTP %d - trying next" % (path, e.code))
        except Exception as e:
            print("  ! details %s -> %s - trying next" % (path, e))
    return None


def normalize_jsearch(job):
    period = job.get("job_salary_period")
    currency = job.get("job_salary_currency")
    location_text = " ".join(filter(None, [job.get("job_city"), job.get("job_state")]))
    highlights = job.get("job_highlights") or {}
    if not isinstance(highlights, dict):
        highlights = {}
    link, direct = best_apply_link(job.get("job_apply_link"), job.get("apply_options"))
    if job.get("job_apply_is_direct"):
        direct = True
    built = build_job(
        job_id="js" + str(job.get("job_id", ""))[:24],
        title=clean(job.get("job_title")),
        desc=clean(job.get("job_description")),
        employer=clean(job.get("employer_name")),
        location_text=location_text,
        sal_min=monthly_salary(job.get("job_min_salary"), period, currency),
        sal_max=monthly_salary(job.get("job_max_salary"), period, currency),
        employment=EMPLOYMENT_MAP.get((job.get("job_employment_type") or "").upper(), "Full-time"),
        apply_url=link,
        apply_direct=direct,
        updated=job.get("job_posted_at_datetime_utc", ""),
        source="JSearch / Google for Jobs (Live)",
        api_skills=job.get("job_required_skills"),
        exp_years=job.get("required_experience_years"),
        reqs=[clean(x) for x in (highlights.get("Qualifications") or []) if isinstance(x, str) and clean(x)],
        resps=[clean(x) for x in (highlights.get("Responsibilities") or []) if isinstance(x, str) and clean(x)],
    )
    # keep the FULL JSearch id for the details lookup (stripped before writing)
    built["_jsid"] = str(job.get("job_id", ""))
    return built


def enrich_with_details(jobs, rapid_key, details_path, count):
    """Upgrade the top doctor-level JSearch jobs with Job Details data."""
    rank = {"General Practitioner": 0, "Consultant": 1, "Specialist": 2}
    cands = [j for j in jobs if j.get("_jsid")]
    cands.sort(key=lambda j: (rank.get(j["profession"], 9), j["postedDaysAgo"]))
    enriched = 0
    for j in cands[:count]:
        try:
            data = fetch_jsearch_details(rapid_key, details_path, j["_jsid"])
            det = extract_jobs(data)
            if not det:
                continue
            upgraded = normalize_jsearch(det[0])
            if upgraded["applyUrl"]:
                j["applyUrl"] = upgraded["applyUrl"]
            if upgraded["applyIsDirect"]:
                j["applyIsDirect"] = True
            if len(upgraded["description"]) > len(j["description"]):
                j["description"] = upgraded["description"]
            if upgraded["requirements"]:
                j["requirements"] = upgraded["requirements"]
            if upgraded["responsibilities"]:
                j["responsibilities"] = upgraded["responsibilities"]
            if upgraded["salaryMax"] and not j["salaryMax"]:
                j["salaryMin"], j["salaryMax"] = upgraded["salaryMin"], upgraded["salaryMax"]
            enriched += 1
        except Exception:
            pass
        time.sleep(1)
    return enriched


# --- credential tests --------------------------------------------------------
def read_error_body(e):
    try:
        return e.read().decode("utf-8", "replace")[:400]
    except Exception:
        return ""


def test_jooble(api_key, host, location):
    try:
        fetch_jooble(api_key, host, "doctor", 1, location)
        print("Jooble key OK.")
        return True
    except urllib.error.HTTPError as e:
        body = read_error_body(e)
        print("\nJOOBLE ERROR (HTTP %d). %s" % (e.code, body))
        if e.code in (401, 403):
            print("Fix: copy the key exactly as shown at https://%s/api/about" % host)
        elif e.code == 404:
            print("Fix: key not issued by %s - register there, or use --host jooble.org" % host)
        return False
    except Exception as e:
        print("\nJOOBLE ERROR: could not reach %s (%s)." % (host, e))
        return False


def test_jsearch(rapid_key, country, location):
    """Probe the known search-endpoint paths; return the working one or None."""
    auth_error = None
    for path in JSEARCH_CANDIDATE_PATHS:
        try:
            data = fetch_jsearch(rapid_key, "doctor in " + location, path, country)
            if isinstance(data, dict) and ("data" in data or "results" in data):
                print("JSearch (RapidAPI) key OK - using endpoint %s (%d jobs in test)."
                      % (path, len(extract_jobs(data))))
                return path
            print("  ! JSearch %s answered but with an unexpected shape - trying next" % path)
        except urllib.error.HTTPError as e:
            body = read_error_body(e)
            if e.code in (401, 403):
                auth_error = (e.code, body)
                break
            print("  ! JSearch %s -> HTTP %d - trying next" % (path, e.code))
        except Exception as e:
            print("  ! JSearch %s -> %s - trying next" % (path, e))
    print("\nJSEARCH ERROR: no working search endpoint found.")
    if auth_error:
        code, body = auth_error
        print("RapidAPI says (HTTP %d): %s" % (code, body))
        if "not subscribed" in body.lower():
            print("Fix: subscribe the SAME RapidAPI app that owns this key at")
            print("https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing (FREE Basic)")
        else:
            print("Fix: re-copy X-RapidAPI-Key from the JSearch Endpoints page (no quotes/spaces).")
    return None


# --- data.js splicing --------------------------------------------------------
def find_array_bounds(text, const_name):
    m = re.search(r"const\s+" + re.escape(const_name) + r"\s*=\s*\[", text)
    if not m:
        raise ValueError("Could not find 'const %s = [' in data.js" % const_name)
    i, depth, quote, esc = m.end(), 1, None, False
    while i < len(text):
        ch = text[i]
        if quote:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                quote = None
        else:
            if ch in "'\"`":
                quote = ch
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return m.start(), i + 1, m.end(), i
        i += 1
    raise ValueError("Array %s is not closed in data.js" % const_name)


def update_data_js(path, jobs, keep_demo, source_entries):
    with open(path, encoding="utf-8") as f:
        text = f.read()

    shutil.copy(path, os.path.join(os.path.dirname(path) or ".", "data.backup.js"))

    start, end, inner_start, inner_end = find_array_bounds(text, "DEMO_JOBS")
    new_inner = json.dumps(jobs, ensure_ascii=False, indent=1)[1:-1]
    if keep_demo:
        old_inner = text[inner_start:inner_end].strip()
        new_inner = old_inner + ",\n" + new_inner
    text = text[:start] + "const DEMO_JOBS = [" + new_inner + "];" + text[end:]

    marker = "const JOB_SOURCES = ["
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    for sid, name, url, api, count in source_entries:
        if sid not in text and marker in text:
            entry = ("\n{ id:'%s', name:'%s', url:'%s', type:'Live API', api:'%s', "
                     "lastSync:'%s', imported:%d, active:true }," % (sid, name, url, api, now, count))
            text = text.replace(marker, marker + entry, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


# --- main --------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="MedMatch live job collector (Jooble + JSearch)")
    ap.add_argument("--key", default=os.environ.get("JOOBLE_KEY", ""), help="Jooble API key")
    ap.add_argument("--rapid-key", default=os.environ.get("RAPIDAPI_KEY", ""), help="RapidAPI key (JSearch)")
    ap.add_argument("--data", default="data.js", help="path to data.js")
    ap.add_argument("--country", default="sa", help="ISO country code to collect from (default: sa)")
    ap.add_argument("--host", default=None, help="Jooble domain (default: derived from --country)")
    ap.add_argument("--pages", type=int, default=2, help="pages per search term per source")
    ap.add_argument("--details", type=int, default=10,
                    help="enrich top N doctor-level jobs via Job Details (default: 10; 0 disables)")
    ap.add_argument("--max-age", type=int, default=MAX_JOB_AGE_DAYS,
                    help="only keep jobs posted in the last N days (default: %d)" % MAX_JOB_AGE_DAYS)
    ap.add_argument("--query", action="append", default=[], help="extra search term (repeatable)")
    ap.add_argument("--keep-demo", action="store_true", help="keep demo jobs and append live ones")
    ap.add_argument("--doctors-only", action="store_true", help="keep only physician-level roles")
    args = ap.parse_args()

    country = args.country.lower().strip()
    location = COUNTRY_NAMES.get(country, args.country)
    host = args.host or ("%s.jooble.org" % country)

    if not args.key and not args.rapid_key:
        print("\nERROR: no API keys given. Provide at least one:")
        print("  --key YOUR_JOOBLE_KEY        (free: https://%s/api/about)" % host)
        print("  --rapid-key YOUR_RAPIDAPI_KEY (free: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing)\n")
        sys.exit(1)
    if not os.path.exists(args.data):
        print("\nERROR: %s not found. Run this script from the folder that contains data.js" % args.data)
        print("(e.g.  cd C:\\Users\\T14S\\Downloads\\artifacts )\n")
        sys.exit(1)

    sources = []
    jsearch_path = None
    if args.key and test_jooble(args.key, host, location):
        sources.append("jooble")
    if args.rapid_key:
        jsearch_path = test_jsearch(args.rapid_key, country, location)
        if jsearch_path:
            sources.append("jsearch")
    if not sources:
        print("\nNo working sources - nothing collected. Fix a key above and retry.")
        sys.exit(1)

    keep_fn = is_doctor_job if args.doctors_only else is_clinical_job
    print("\nSources: %s | country: %s (%s) | filter: %s | max age: %d days\n"
          % (" + ".join(sources), location, country,
             "doctors only" if args.doctors_only else "all clinical roles", args.max_age))

    queries = DEFAULT_QUERIES + [q for q in args.query if q not in DEFAULT_QUERIES]
    seen, jobs = set(), []
    per_source = {"jooble": 0, "jsearch": 0}
    skipped_clinical = skipped_old = skipped_dup = skipped_bad = 0
    cursor_note_shown = False

    for src in sources:
        print("--- %s ---" % src.upper())
        if src == "jooble":
            work = list(queries)
        else:
            work = [q + " in " + location for q in queries]
            work += ["%s in %s via linkedin" % (q, location) for q in LINKEDIN_QUERIES]

        for q in work:
            cursor = None
            for page in range(1, args.pages + 1):
                try:
                    if src == "jooble":
                        data = fetch_jooble(args.key, host, q, page, location)
                        raw = [x for x in (data.get("jobs") or []) if isinstance(x, dict)]
                        total = data.get("totalCount", "?")
                        normalizer = normalize_jooble
                    else:
                        data = fetch_jsearch(args.rapid_key, q, jsearch_path, country, cursor)
                        raw = extract_jobs(data)
                        cursor = extract_cursor(data)
                        total = "?"
                        normalizer = normalize_jsearch
                except urllib.error.HTTPError as e:
                    body = read_error_body(e)
                    print("  ! %s page %d failed (HTTP %d)%s" % (q, page, e.code, (" - " + body) if body else ""))
                    if src == "jsearch" and e.code == 429:
                        print("  ! JSearch monthly quota exhausted - continuing with other source.")
                    break
                except Exception as e:
                    print("  ! %s page %d failed (%s) - skipping" % (q, page, e))
                    break
                print("  %-42s page %d -> %d jobs (total: %s)" % (q, page, len(raw), total))
                for job in raw:
                    try:
                        norm = normalizer(job)
                    except Exception:
                        skipped_bad += 1
                        continue
                    if not keep_fn(norm["title"], norm["description"]):
                        skipped_clinical += 1
                        continue
                    if norm["postedDaysAgo"] > args.max_age:
                        skipped_old += 1
                        continue
                    dedup = (norm["title"].lower(), norm["employer"].lower(), norm["city"])
                    if not norm["title"]:
                        continue
                    if dedup in seen:
                        skipped_dup += 1
                        continue
                    seen.add(dedup)
                    jobs.append(norm)
                    per_source[src] += 1
                if not raw:
                    break
                if src == "jsearch" and not cursor:
                    if page == 1 and len(raw) >= 10 and not cursor_note_shown:
                        print("     (JSearch caps this query at one 10-job page - no next-page cursor returned)")
                        cursor_note_shown = True
                    break
                time.sleep(1)

    if not jobs:
        print("\nNo fresh clinical jobs collected - data.js was NOT modified.")
        print('Try:  python collector.py --key .. --pages 4 --max-age 60 --query "doctor riyadh"')
        sys.exit(0)

    # --- Job Details enrichment for top doctor-level matches ---
    enriched = 0
    if "jsearch" in sources and args.details > 0:
        sample = next((j["_jsid"] for j in jobs if j.get("_jsid")), None)
        details_path = probe_details_path(args.rapid_key, sample) if sample else None
        if details_path:
            print("Enriching top %d doctor-level jobs with Job Details..." % args.details)
            enriched = enrich_with_details(jobs, args.rapid_key, details_path, args.details)
        else:
            print("Job Details endpoint not available on this plan - skipping enrichment.")

    for j in jobs:
        j.pop("_jsid", None)

    source_entries = []
    if per_source["jooble"]:
        source_entries.append(("src-jooble", "Jooble (Live API)", "https://jooble.org/api/about",
                               "Jooble REST API", per_source["jooble"]))
    if per_source["jsearch"]:
        source_entries.append(("src-jsearch", "JSearch / Google for Jobs (Live)",
                               "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch",
                               "JSearch REST API (RapidAPI)", per_source["jsearch"]))

    update_data_js(args.data, jobs, args.keep_demo, source_entries)

    cities = {}
    for j in jobs:
        cities[j["city"]] = cities.get(j["city"], 0) + 1
    profs = {}
    for j in jobs:
        profs[j["profession"]] = profs.get(j["profession"], 0) + 1
    direct = sum(1 for j in jobs if j.get("applyIsDirect"))
    insurance = sum(1 for j in jobs if j.get("specialty") == "Medical Insurance")
    top = ", ".join("%s (%d)" % kv for kv in sorted(cities.items(), key=lambda x: -x[1])[:5])
    prof_line = ", ".join("%s (%d)" % kv for kv in sorted(profs.items(), key=lambda x: -x[1]))

    print("\nDone! %d clinical jobs written into %s" % (len(jobs), args.data))
    print("Per source: Jooble %d, JSearch %d." % (per_source["jooble"], per_source["jsearch"]))
    print("Filtered out: %d non-clinical, %d older than %d days, %d duplicates, %d unparsable."
          % (skipped_clinical, skipped_old, args.max_age, skipped_dup, skipped_bad))
    print("Employer-direct apply links: %d of %d (details-enriched: %d)." % (direct, len(jobs), enriched))
    print("Medical insurance / pre-auth roles: %d." % insurance)
    print("By profession: %s" % prof_line)
    print("Top cities: %s" % top)
    print("Backup of the previous data: data.backup.js")
    print("Now reopen index.html - jobs from both sources are live.")


if __name__ == "__main__":
    main()
