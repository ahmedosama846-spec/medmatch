#!/usr/bin/env node
/* ============================================================
   MedMatch — weekly personalized job alerts (GitHub Actions).

   Runs the REAL matching engine (engine.js) against every cloud
   user's stored profile, picks new strong matches they haven't
   been emailed about, and sends one digest per user via Brevo
   (free tier: 300 emails/day).

   Secrets needed (repo → Settings → Secrets → Actions):
     SUPABASE_URL          e.g. https://xyz.supabase.co
     SUPABASE_SERVICE_KEY  the sb_secret_... key — GitHub ONLY,
                           never in app.js (it bypasses RLS)
     BREVO_API_KEY         brevo.com → SMTP & API → API Keys
     ALERT_FROM            your verified sender email (e.g. Gmail)

   Opt-out: users flip a toggle in Dashboard → Preferences; the
   flag lives in their synced data (alertOptIn === false).
   ============================================================ */
'use strict';

const fs = require('fs');
const vm = require('vm');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, ALERT_FROM } = process.env;
const SITE_URL = process.env.SITE_URL || 'https://ahmedosama846-spec.github.io/medmatch/';
const MIN_SCORE = 65;
const MAX_JOBS = 5;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BREVO_API_KEY || !ALERT_FROM) {
  console.error('Missing env: need SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, ALERT_FROM');
  process.exit(1);
}

/* ---------- load data.js + engine.js into a shared VM context ---------- */
const ctx = vm.createContext({ console: console, window: {} });
vm.runInContext(fs.readFileSync('data.js', 'utf8'), ctx, { filename: 'data.js' });
vm.runInContext(fs.readFileSync('engine.js', 'utf8'), ctx, { filename: 'engine.js' });
const DEMO_JOBS = vm.runInContext('typeof DEMO_JOBS !== "undefined" ? DEMO_JOBS : window.DEMO_JOBS', ctx);
const Engine = vm.runInContext('typeof Engine !== "undefined" ? Engine : window.Engine', ctx);
if (!DEMO_JOBS || !Engine) {
  console.error('Could not load DEMO_JOBS / Engine from data.js / engine.js');
  process.exit(1);
}
console.log('Loaded %d jobs and the matching engine.', DEMO_JOBS.length);

/* ---------- tiny helpers ---------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function sbGet(path) {
  const r = await fetch(SUPABASE_URL + path, { headers: sbHeaders });
  if (!r.ok) throw new Error('Supabase GET ' + path + ' → ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function sbPatchData(userId, data) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/user_data?id=eq.' + encodeURIComponent(userId), {
    method: 'PATCH',
    headers: sbHeaders,
    body: JSON.stringify({ data: data, updated_at: new Date().toISOString() })
  });
  if (!r.ok) throw new Error('PATCH user ' + userId + ' → ' + r.status);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- email template ---------- */
function jobRow(job, score) {
  const salary = (job.salaryMin || job.salaryMax)
    ? 'SAR ' + (job.salaryMin || 0).toLocaleString() + '–' + (job.salaryMax || 0).toLocaleString()
    : 'Salary not stated';
  return '<tr><td style="padding:14px 0;border-bottom:1px solid #e8edf2">' +
    '<div style="font-weight:700;color:#12343b">' + esc(job.title) + '</div>' +
    '<div style="color:#5b6b73;font-size:13px;margin-top:2px">' + esc(job.employer) + ' · ' + esc(job.city) + '</div>' +
    '<div style="margin-top:6px">' +
    '<span style="background:#0e9f8a;color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700">' + score + '% match</span> ' +
    '<span style="color:#5b6b73;font-size:12px">' + esc(job.employment) + ' · ' + esc(salary) + '</span>' +
    '</div></td></tr>';
}

function buildEmail(name, picks) {
  const rows = picks.map((p) => jobRow(p.job, p.score)).join('');
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#12343b">' +
    '<div style="background:#0e9f8a;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">' +
    '<b style="font-size:18px">✚ MedMatch</b></div>' +
    '<div style="border:1px solid #e8edf2;border-top:none;border-radius:0 0 12px 12px;padding:20px 22px">' +
    '<p style="margin:0 0 4px">Hi ' + esc(name) + ',</p>' +
    '<p style="margin:0 0 12px;color:#5b6b73"><b>' + picks.length + '</b> new job' + (picks.length > 1 ? 's' : '') +
    ' matched your profile this week:</p>' +
    '<table style="width:100%;border-collapse:collapse">' + rows + '</table>' +
    '<p style="text-align:center;margin:22px 0 6px">' +
    '<a href="' + SITE_URL + '" style="background:#0e9f8a;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700">View &amp; apply →</a></p>' +
    '<p style="color:#93a3aa;font-size:11px;margin:18px 0 0">You receive this because you have a MedMatch account. ' +
    'To stop these emails: sign in → Dashboard → Preferences → turn off email alerts.</p>' +
    '</div></div>';
}

/* ---------- send via Brevo ---------- */
async function sendEmail(toEmail, toName, subject, html) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'MedMatch Alerts', email: ALERT_FROM },
      to: [{ email: toEmail, name: toName }],
      subject: subject,
      htmlContent: html
    })
  });
  if (!r.ok) throw new Error('Brevo → ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

/* ---------- main ---------- */
(async () => {
  const usersResp = await sbGet('/auth/v1/admin/users?per_page=1000');
  const users = usersResp.users || usersResp || [];
  const rows = await sbGet('/rest/v1/user_data?select=id,data');
  const byId = {};
  rows.forEach((r) => { byId[r.id] = r.data || {}; });
  console.log('%d auth users, %d data rows.', users.length, rows.length);

  let sent = 0, skipped = 0, failed = 0;

  for (const u of users) {
    const email = (u.email || '').toLowerCase();
    if (!email) continue;
    const data = byId[u.id];
    try {
      if (!data) { skipped++; continue; }
      if (data.alertOptIn === false) { skipped++; continue; }
      const profile = data.profile || {};
      if (!profile.profession && !data.cvText) { skipped++; continue; }

      const prevIds = data.lastAlertJobIds || [];
      const scored = DEMO_JOBS
        .map((job) => ({ job: job, score: Engine.scoreJob(profile, job).score }))
        .sort((a, b) => b.score - a.score);

      let picks = scored.filter((p) => p.score >= MIN_SCORE && prevIds.indexOf(p.job.id) === -1)
        .slice(0, MAX_JOBS);
      if (!picks.length && !prevIds.length) {
        picks = scored.slice(0, MAX_JOBS).filter((p) => p.score >= MIN_SCORE);
      }
      if (!picks.length) { skipped++; continue; }

      const name = profile.fullName || (u.user_metadata && u.user_metadata.name) || email.split('@')[0];
      const subject = picks.length + ' new job match' + (picks.length > 1 ? 'es' : '') + ' for you — MedMatch';
      await sendEmail(email, name, subject, buildEmail(name, picks));

      data.lastAlertAt = new Date().toISOString();
      data.lastAlertJobIds = picks.map((p) => p.job.id);
      await sbPatchData(u.id, data);

      sent++;
      console.log('  sent → %s (%d jobs, top %d%%)', email, picks.length, picks[0].score);
      await sleep(250); // be gentle with the email API
    } catch (e) {
      failed++;
      console.error('  FAILED %s: %s', email, e.message);
    }
  }

  console.log('\n=== RESULT === sent: %d | skipped: %d | failed: %d', sent, skipped, failed);
})().catch((e) => { console.error(e); process.exit(1); });
