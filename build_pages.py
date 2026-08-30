#!/usr/bin/env python3
"""
MedMatch — static SEO page builder.

Turns every live (non-demo) job in data.js into a real, crawlable HTML
page under jobs/, with schema.org JobPosting JSON-LD (Google for Jobs
rich results), Open Graph tags, and a CTA back into the app. Also emits
per-city and per-profession index pages, jobs/index.html, sitemap.xml
and robots.txt.

Runs in the Monday pipeline AFTER filter_jobs.py, so only clean,
clinical jobs get indexed. Demo jobs (demo: true) are never published.

    python build_pages.py
"""
import html
import json
import os
import re
import subprocess
import sys
from datetime import date, timedelta

DATA_FILE = "data.js"
OUT_DIR = "jobs"
BASE = "https://ahmedosama846-spec.github.io/medmatch/"
APP_LINK = "../index.html"

try:
    import json5
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "json5"])
    import json5

EMP_TYPE = {"Full-time": "FULL_TIME", "Part-time": "PART_TIME",
            "Contract": "CONTRACTOR", "Temporary": "TEMPORARY"}


def read_const(src, name):
    m = re.search(r"const %s\s*=\s*(\[.*?\]);" % name, src, re.S)
    if not m:
        return None
    text = m.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json5.loads(text)


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "other"


def esc(s):
    return html.escape(str(s or ""), quote=True)


def salary_text(j):
    if j.get("salaryMin") or j.get("salaryMax"):
        return "SAR %s–%s / month" % (f"{j.get('salaryMin', 0):,}", f"{j.get('salaryMax', 0):,}")
    return "Salary not stated"


def jsonld(j, page_url):
    today = date.today()
    posted = today - timedelta(days=int(j.get("postedDaysAgo") or 0))
    desc = "<p>%s</p>" % esc(j.get("description") or j.get("title"))
    if j.get("requirements"):
        desc += "<p><b>Requirements:</b></p><ul>" + "".join(
            "<li>%s</li>" % esc(r) for r in j["requirements"]) + "</ul>"
    ld = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": j.get("title"),
        "description": desc,
        "identifier": {"@type": "PropertyValue", "name": "MedMatch", "value": j.get("id")},
        "datePosted": posted.isoformat(),
        "validThrough": (posted + timedelta(days=60)).isoformat(),
        "employmentType": EMP_TYPE.get(j.get("employment"), "OTHER"),
        "hiringOrganization": {"@type": "Organization", "name": j.get("employer") or "See posting"},
        "jobLocation": {"@type": "Place", "address": {
            "@type": "PostalAddress",
            "addressLocality": j.get("city") if j.get("city") != "Other" else "Saudi Arabia",
            "addressCountry": "SA"}},
        "directApply": True,
        "url": page_url,
    }
    if j.get("salaryMin") or j.get("salaryMax"):
        ld["baseSalary"] = {"@type": "MonetaryAmount", "currency": "SAR",
                            "value": {"@type": "QuantitativeValue",
                                      "minValue": j.get("salaryMin") or 0,
                                      "maxValue": j.get("salaryMax") or 0,
                                      "unitText": "MONTH"}}
    return json.dumps(ld, ensure_ascii=False)


def page_shell(title, meta_desc, canonical, ld, body):
    ld_tag = '<script type="application/ld+json">%s</script>' % ld if ld else ""
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<link rel="canonical" href="%s">
<meta property="og:type" content="article">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:url" content="%s">
%s
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<nav class="nav"><div class="nav-inner">
<a class="brand" href="../index.html"><span class="logo">✚</span>Med<em>Match</em></a>
<div class="nav-cta"><a class="btn btn-primary btn-sm" href="../index.html">Open MedMatch →</a></div>
</div></nav>
<section class="section"><div class="container" style="max-width:820px">
%s
</div></section>
<footer class="footer"><div class="container"><p style="margin:0">© 2026 MedMatch · <a href="../privacy.html" style="color:#7fb5ae">Privacy</a> · Listing aggregated from its original source; verify details with the employer.</p></div></footer>
</body>
</html>
""" % (esc(title), esc(meta_desc), canonical, esc(title), esc(meta_desc), canonical, ld_tag, body)


def job_page(j):
    page_url = "%s%s/%s.html" % (BASE, OUT_DIR, j["id"])
    title = "%s — %s (%s) | MedMatch" % (j.get("title"), j.get("employer"), j.get("city"))
    meta = re.sub(r"\s+", " ", (j.get("description") or ""))[:155] or \
        "%s at %s, %s. %s" % (j.get("title"), j.get("employer"), j.get("city"), salary_text(j))

    badges = ('<span class="badge badge-gray">%s</span> <span class="badge badge-blue">%s</span> '
              '<span class="badge badge-teal">%s</span> <span class="badge badge-gray">%s–%s yrs</span>'
              % (esc(j.get("profession")), esc(j.get("employment")), esc(salary_text(j)),
                 j.get("expMin", 0), j.get("expMax", 0)))

    reqs = ""
    if j.get("requirements"):
        reqs = "<h3>Requirements</h3><ul class='analysis-list'>" + "".join(
            "<li><span class='mk mk-info'>•</span><span>%s</span></li>" % esc(r)
            for r in j["requirements"]) + "</ul>"
    resp = ""
    if j.get("responsibilities"):
        resp = "<h3>Responsibilities</h3><ul class='analysis-list'>" + "".join(
            "<li><span class='mk mk-info'>•</span><span>%s</span></li>" % esc(r)
            for r in j["responsibilities"]) + "</ul>"

    body = """
<div class="card">
  <h1 style="margin:0 0 6px;font-size:1.5rem">%s</h1>
  <div class="job-emp">%s · %s</div>
  <div class="job-meta" style="margin-top:10px">%s</div>
  <p style="margin-top:16px">%s</p>
  %s
  %s
  <div class="flex mt wrap">
    <a class="btn btn-primary" href="%s">See your match score &amp; apply on MedMatch →</a>
  </div>
  <p class="muted" style="font-size:.8rem;margin-top:14px">Source: %s · Posted %s · MedMatch analyzes this posting against your CV — sign in free.</p>
</div>
""" % (esc(j.get("title")), esc(j.get("employer")), esc(j.get("city")), badges,
       esc(j.get("description")), reqs, resp, APP_LINK,
       esc(j.get("source")), ("today" if not j.get("postedDaysAgo") else "%d days ago" % j["postedDaysAgo"]))

    return page_shell(title, esc(meta), page_url, jsonld(j, page_url), body)


def listing_page(fname, title, sub, jobs):
    page_url = BASE + OUT_DIR + "/" + fname
    items = "".join(
        '<div class="card hover job-card"><p class="job-title"><a href="%s.html" style="color:inherit;text-decoration:none">%s</a></p>'
        '<div class="job-emp">%s · %s · %s</div></div>'
        % (j["id"], esc(j.get("title")), esc(j.get("employer")), esc(j.get("city")), esc(salary_text(j)))
        for j in jobs)
    body = "<h1 style='margin:0 0 4px'>%s</h1><p class='muted'>%s</p><div class='grid'>%s</div>" % (esc(title), esc(sub), items)
    return page_shell("%s | MedMatch" % title, sub, page_url, "", body)


def main():
    src = open(DATA_FILE, encoding="utf-8").read()
    jobs = read_const(src, "DEMO_JOBS") or []
    live = [j for j in jobs if not j.get("demo")]
    print("Building pages for %d live jobs (skipping %d demo)..." % (len(live), len(jobs) - len(live)))

    os.makedirs(OUT_DIR, exist_ok=True)
    urls = [BASE, BASE + "privacy.html", BASE + OUT_DIR + "/index.html"]

    for j in live:
        fn = os.path.join(OUT_DIR, j["id"] + ".html")
        open(fn, "w", encoding="utf-8").write(job_page(j))
        urls.append(BASE + OUT_DIR + "/" + j["id"] + ".html")

    # index of everything
    ordered = sorted(live, key=lambda j: (j.get("profession") or "", j.get("city") or ""))
    open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8").write(
        listing_page("index.html", "All healthcare jobs — Saudi Arabia",
                     "%d live postings, matched to your CV on MedMatch." % len(live), ordered))

    # per-city + per-profession landing pages
    groups = {}
    for j in live:
        groups.setdefault(("city", j.get("city") or "Other"), []).append(j)
        groups.setdefault(("prof", j.get("profession") or "Other"), []).append(j)
    for (kind, key), js in groups.items():
        if not key or key == "Other" or len(js) < 1:
            continue
        if kind == "city":
            fname, title = "city-%s.html" % slug(key), "Healthcare jobs in %s" % key
            sub = "%d open healthcare roles in %s — matched to your CV on MedMatch." % (len(js), key)
        else:
            fname, title = "prof-%s.html" % slug(key), "%s jobs in Saudi Arabia" % key
            sub = "%d open %s roles in Saudi Arabia — matched to your CV on MedMatch." % (len(js), key)
        open(os.path.join(OUT_DIR, fname), "w", encoding="utf-8").write(listing_page(fname, title, sub, js))
        urls.append(BASE + OUT_DIR + "/" + fname)

    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append("<url><loc>%s</loc><lastmod>%s</lastmod></url>" % (u, today))
    sm.append("</urlset>")
    open("sitemap.xml", "w", encoding="utf-8").write("\n".join(sm))

    open("robots.txt", "w", encoding="utf-8").write(
        "User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n" % BASE)

    print("Wrote %d job pages + %d landing pages + sitemap.xml (%d URLs) + robots.txt"
          % (len(live), len([u for u in urls if "/jobs/" in u and not u.endswith((".html",))
                             ]) if False else sum(1 for u in urls if ("/jobs/city-" in u or "/jobs/prof-" in u)),
             len(urls)))


if __name__ == "__main__":
    main()
