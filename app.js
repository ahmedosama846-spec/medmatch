/* ============================================================
   MedMatch — app.js (UI layer, v20)
   Renders the whole app into #app.
   Depends on globals from data.js  (DEMO_JOBS, CITIES, PROFESSIONS,
   EMPLOYMENT_TYPES, JOB_SOURCES, SAMPLE_CV_TEXT, SKILLS_VOCAB) and
   on the Engine API from engine.js + engine_fix.js hardening.
   No fetch() — works over file:// .

   v20: PRIVACY. privacy.html linked in the footer and auth modal;
   Dashboard gains a "Privacy & your data" card with a working
   Delete-my-data action (erases the cloud row + local cache).
   v19: email alerts opt-in toggle.
   v18: cloud accounts — Supabase magic links + cross-device sync.
   v17: guest teaser — locked employer/salary/apply for guests.
   v16: feedback loop — activity log + learned boost + GoatCounter.
   v15: auth gate — personal features require sign-in.
   v11: semantic matching (65% rules + 35% AI similarity).
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     Cloud accounts + cross-device sync (Supabase).
     ============================================================ */
  const SUPABASE_URL = 'https://qglgpckjspltwetctzgv.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_TJIQpJIhPxkKDmH8YgIoVw_zuCNxzel';

  /* ============================================================
     OPTIONAL: anonymous aggregate analytics (GoatCounter).
     Events sent contain ONLY job metadata — never CV text, names,
     emails, or anything from a user's account.
     ============================================================ */
  const GOATCOUNTER_CODE = '';

  /* ---------- guards ---------- */
  if (typeof Engine === 'undefined' || typeof DEMO_JOBS === 'undefined') {
    document.getElementById('app').innerHTML =
      '<div class="container section"><div class="card"><h2>Missing files</h2>' +
      '<p><code>data.js</code> or <code>engine.js</code> failed to load. ' +
      'Make sure <b>index.html, styles.css, data.js, engine.js, engine_fix.js and app.js</b> ' +
      'are all in the same folder, then reopen index.html.</p></div></div>';
    return;
  }

  /* ---------- helpers ---------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fmt = (n) => Engine.fmtNum ? Engine.fmtNum(n) : String(n);
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const pretty = (s) => String(s || '').replace(/_/g, ' ');
  const posted = (d) => d <= 0 ? 'Today' : d === 1 ? '1 day ago' : d + ' days ago';
  const isRealUrl = (u) => /^https?:\/\//i.test(u || '');
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function hostOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'the source site'; }
  }

  function toast(msg, kind) {
    const box = $('#toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'info');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 6000);
  }

  let errShown = false;
  window.addEventListener('error', (e) => {
    if (errShown) return;
    errShown = true;
    toast('Something hit an error: ' + (e.message || 'unknown'), 'err');
    setTimeout(() => { errShown = false; }, 8000);
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (errShown) return;
    errShown = true;
    const r = e.reason;
    toast('Background error: ' + ((r && r.message) || r || 'unknown'), 'err');
    setTimeout(() => { errShown = false; }, 8000);
  });

  /* ============================================================
     GoatCounter (anonymous aggregate) — optional
     ============================================================ */
  function gcReady() {
    return !!(GOATCOUNTER_CODE && window.goatcounter && window.goatcounter.count);
  }
  function gcEvent(path, title) {
    if (!gcReady()) return;
    try { window.goatcounter.count({ path: path, title: title || path, event: true }); } catch (e) { /* ignore */ }
  }
  function gcPage(route) {
    if (!gcReady()) return;
    try { window.goatcounter.count({ path: '/' + route }); } catch (e) { /* ignore */ }
  }
  (function loadGoatCounter() {
    if (!GOATCOUNTER_CODE) return;
    const s = document.createElement('script');
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER_CODE + '.goatcounter.com/count');
    s.async = true;
    document.head.appendChild(s);
  })();

  /* ============================================================
     Accounts: cloud (Supabase magic links) when configured,
     browser-local otherwise. Personal data lives in account
     storage only — guests store nothing.
     ============================================================ */
  const ACC_KEY = 'medmatch_accounts';
  const SES_KEY = 'medmatch_session';
  const GUEST_KEY = 'medmatch_saudi_v1'; // legacy slot — removed on load

  function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  let currentUser = null; // { email, name, cloud? }

  function accountKey(email) { return 'medmatch_data_' + email; }
  function cloudEnabled() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY); }
  function acctWord() { return cloudEnabled() ? 'account' : 'local account'; }

  function persistState() {
    if (!currentUser) return; // guests store nothing personal
    saveJSON(accountKey(currentUser.email), {
      profile: state.profile, cvText: state.cvText, saved: state.saved,
      filters: state.filters, notifsReadIds: state.notifsReadIds,
      events: state.events, alertOptIn: state.alertOptIn
    });
  }

  function applyData(data) {
    if (!data) return;
    state.profile = data.profile || emptyProfile();
    state.cvText = data.cvText || '';
    state.saved = data.saved || {};
    state.filters = data.filters || state.filters;
    state.notifsReadIds = data.notifsReadIds || [];
    state.events = data.events || [];
    state.alertOptIn = data.alertOptIn !== false;
  }

  function wipeState() {
    state.profile = emptyProfile();
    state.cvText = '';
    state.saved = {};
    state.notifsReadIds = [];
    state.events = [];
    state.alertOptIn = true;
    embState.cvVec = null;
    embState.ready = false;
  }

  /* ---------- Supabase cloud layer ---------- */
  let sb = null;
  let handledUid = null;

  function loadSupabase() {
    return new Promise((resolve) => {
      if (window.supabase && window.supabase.createClient) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function statePayload() {
    return {
      profile: state.profile, cvText: state.cvText, saved: state.saved,
      filters: state.filters, notifsReadIds: state.notifsReadIds,
      events: state.events, alertOptIn: state.alertOptIn
    };
  }

  let pushTimer = null;
  function pushCloud() {
    if (!sb || !currentUser || !currentUser.cloud) return Promise.resolve();
    return sb.auth.getUser().then(({ data }) => {
      const user = data && data.user;
      if (!user) return;
      return sb.from('user_data')
        .upsert({ id: user.id, data: statePayload(), updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn('cloud sync:', error.message); });
    }).catch((e) => console.warn('cloud sync:', e));
  }
  function schedulePush() {
    if (!currentUser || !currentUser.cloud) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushCloud, 1200); // debounce bursts of saves
  }

  async function onCloudSignIn(user) {
    if (!user || handledUid === user.id) return;
    handledUid = user.id;
    const email = (user.email || '').toLowerCase();
    const name = (user.user_metadata && user.user_metadata.name) || email.split('@')[0];
    currentUser = { email: email, name: name, cloud: true };
    wipeState();
    try {
      const { data } = await sb.from('user_data').select('data').eq('id', user.id).maybeSingle();
      if (data && data.data) {
        applyData(data.data);
      } else {
        /* first cloud sign-in on this account: adopt any local data */
        const local = loadJSON(accountKey(email));
        if (local) { applyData(local); pushCloud(); }
      }
    } catch (e) { /* offline — fall back to local cache */
      const local = loadJSON(accountKey(email));
      if (local) applyData(local);
    }
    save();
    App.closeModal();
    render();
    if (state.cvText) warmupSemantic(true);
    toast('Signed in as ' + email + ' — your data syncs across devices. ☁', 'ok');
  }

  async function initCloud() {
    if (!cloudEnabled()) return;
    const ok = await loadSupabase();
    if (!ok) { console.warn('Supabase SDK failed to load — local mode.'); return; }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    sb.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user) {
        setTimeout(() => onCloudSignIn(session.user), 0);
      }
    });
    const { data } = await sb.auth.getSession();
    if (data && data.session && data.session.user) onCloudSignIn(data.session.user);
  }

  async function sendMagicLink(email, name, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: location.href.split('#')[0],
          data: name ? { name: name } : undefined
        }
      });
      if (error) throw error;
      $('#modal-root').innerHTML =
        '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal">' +
        '<div class="center" style="padding:20px 0"><div style="font-size:44px">📬</div>' +
        '<h3>Check your email</h3>' +
        '<p class="muted">We sent a sign-in link to <b>' + esc(email) + '</b>.<br>' +
        'Click it and you\'ll land back here, signed in — on any device.</p>' +
        '<button class="btn btn-outline" onclick="App.closeModal()">Close</button></div></div></div>';
    } catch (e) {
      const errEl = $('#authErr');
      if (errEl) { errEl.textContent = e.message || 'Could not send the link — try again.'; errEl.classList.remove('hidden'); }
      if (btn) { btn.disabled = false; btn.textContent = 'Email me a sign-in link'; }
    }
  }

  /* ---------- state ---------- */
  function emptyProfile() {
    return {
      fullName: '', email: '', phone: '', nationality: '', currentCountry: '', location: '',
      profession: '', specialty: '', currentPosition: '', years: null,
      preferredCities: [], preferredSalary: '', employmentType: '', availability: '',
      scfhsClassification: '', scfhsRegistration: '', saudiLicense: '', dataflow: '', prometric: '',
      education: [], work: [], skills: [], certs: []
    };
  }

  const state = {
    route: 'home',
    profile: emptyProfile(),
    cvText: '',
    filters: { profession: '', city: '', employment: '', minSalary: '', nl: '' },
    saved: {},
    notifsReadIds: [],
    events: [],        // { t, type, id, prof, city } — the feedback loop
    alertOptIn: true   // weekly email alerts (cloud accounts)
  };

  /* restore: local-mode session (cloud restores async via initCloud) */
  (function boot() {
    try { localStorage.removeItem(GUEST_KEY); } catch (e) { /* ignore */ }
    if (cloudEnabled()) return; // cloud session handled by initCloud()
    const ses = loadJSON(SES_KEY);
    const accs = loadJSON(ACC_KEY) || {};
    if (ses && ses.email && accs[ses.email]) {
      currentUser = { email: ses.email, name: accs[ses.email].name };
      applyData(loadJSON(accountKey(ses.email)));
    }
  })();

  function save() { persistState(); schedulePush(); }

  /* ============================================================
     Feedback loop: activity log + learned boost
     ============================================================ */
  const EVENT_W = { view: 1, search: 1, save: 2, interested: 2, apply: 3, interview: 3, offer: 3, rejected: 0, withdrawn: 0 };

  function pushEvent(e) {
    state.events.push(e);
    if (state.events.length > 500) state.events = state.events.slice(-500);
  }

  function trackEvent(type, job) {
    if (job) gcEvent(type + '/' + job.id, type + ': ' + job.title + ' @ ' + job.employer);
    if (!currentUser || !job) return;
    pushEvent({ t: Date.now(), type: type, id: job.id, prof: job.profession, city: job.city });
    save();
  }

  function learnedBoost(job) {
    if (!currentUser || !state.events.length) return 0;
    let profPts = 0, cityPts = 0;
    state.events.forEach((e) => {
      const w = EVENT_W[e.type] !== undefined ? EVENT_W[e.type] : 1;
      if (e.prof && e.prof === job.profession) profPts += w;
      if (e.city && e.city === job.city) cityPts += w;
    });
    return Math.min(8, Math.min(6, profPts) + Math.min(4, cityPts));
  }

  /* ============================================================
     Semantic (AI similarity) layer
     ============================================================ */
  const embState = { jobs: null, cvVec: null, loading: false, ready: false };

  function loadScriptOnce(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  async function ensureJobEmbeddings() {
    if (embState.jobs) return Object.keys(embState.jobs).length > 0;
    if (typeof JOB_EMBEDDINGS === 'undefined') {
      await loadScriptOnce('embeddings.js');
    }
    embState.jobs = (typeof JOB_EMBEDDINGS !== 'undefined') ? JOB_EMBEDDINGS : {};
    return Object.keys(embState.jobs).length > 0;
  }

  async function ensureCvVector() {
    if (embState.cvVec) return true;
    if (!state.cvText) return false;
    const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    const extractor = await mod.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    const words = state.cvText.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += 200) chunks.push(words.slice(i, i + 200).join(' '));
    const vecs = [];
    for (const ch of chunks) {
      const out = await extractor(ch, { pooling: 'mean', normalize: true });
      vecs.push(Array.from(out.data));
    }
    const dims = vecs[0].length;
    const v = new Array(dims).fill(0);
    vecs.forEach((vv) => vv.forEach((x, i) => { v[i] += x / vecs.length; }));
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    embState.cvVec = v.map((x) => x / n);
    return true;
  }

  function dequant(e) { return e.q.map((x) => x * e.s / 127); }
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function semFromCos(c) { return Math.max(0, Math.min(100, Math.round((c - 0.10) * 200))); }

  function semanticScore(job) {
    if (!embState.ready || !embState.cvVec || !embState.jobs) return null;
    const e = embState.jobs[job.id];
    if (!e) return null;
    return semFromCos(dot(embState.cvVec, dequant(e)));
  }

  function warmupSemantic(silent) {
    if (embState.ready || embState.loading || !state.cvText) return;
    embState.loading = true;
    if (!silent) toast('Loading AI matching model (first time downloads ~25 MB)…', 'info');
    Promise.all([ensureJobEmbeddings(), ensureCvVector()])
      .then(([hasJobs, hasCv]) => {
        embState.ready = !!(hasJobs && hasCv);
        embState.loading = false;
        if (embState.ready) {
          if (!silent) toast('AI similarity enabled — scores now blend rules + semantics.', 'ok');
          render();
        }
      })
      .catch(() => { embState.loading = false; });
  }

  /* ---------- scoring & filtering ---------- */
  function finalScore(res) {
    return (res.semantic === null || res.semantic === undefined)
      ? res.score
      : Math.round(res.score * 0.65 + res.semantic * 0.35);
  }

  function scoredJobs() {
    return DEMO_JOBS.map((job) => {
      const res = Engine.scoreJob(state.profile, job);
      res.semantic = semanticScore(job);
      res.boost = learnedBoost(job);
      res.final = Math.min(100, finalScore(res) + res.boost);
      return { job, res };
    });
  }

  function filteredJobs() {
    const f = state.filters;
    const nl = f.nl ? Engine.parseNLQuery(f.nl) : null;
    return scoredJobs()
      .filter(({ job, res }) => {
        if (f.profession && job.profession !== f.profession) return false;
        if (f.city && job.city !== f.city) return false;
        if (f.employment && job.employment !== f.employment) return false;
        const ms = parseFloat(f.minSalary);
        if (ms && job.salaryMax < ms) return false;
        if (nl) {
          if (nl.profession && job.profession !== nl.profession) return false;
          if (nl.city && job.city !== nl.city) return false;
          if (nl.minSalary && job.salaryMax < nl.minSalary) return false;
          if (nl.minScore && res.final < nl.minScore) return false;
          if (nl.employment && job.employment !== nl.employment) return false;
          if (nl.saudiExpOk && job.saudiExp === 'required') return false;
        }
        return true;
      })
      .sort((a, b) => b.res.final - a.res.final);
  }

  const topMatches = (n) => scoredJobs().sort((a, b) => b.res.final - a.res.final).slice(0, n);

  /* ---------- small components ---------- */
  const COLOR_VAR = { green: '--green', teal: '--teal', blue: '--blue', amber: '--amber', gray: '--muted', red: '--red' };

  function ring(score, color) {
    const r = 26, c = 2 * Math.PI * r;
    const off = (c * (1 - Math.max(0, Math.min(100, score)) / 100)).toFixed(1);
    return '<span class="ring"><svg width="64" height="64" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="' + r + '" stroke="#e6edf3" stroke-width="6" fill="none"/>' +
      '<circle cx="32" cy="32" r="' + r + '" stroke="var(' + (COLOR_VAR[color] || '--teal') + ')" stroke-width="6" fill="none" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off + '"/>' +
      '</svg><span class="ring-label">' + score + '</span></span>';
  }

  function matchBadge(score) {
    const pair = Engine.matchLabel(score);
    const label = pair[0], color = pair[1];
    return '<span class="badge badge-' + color + '">' + esc(label) + '</span>';
  }

  function salaryBadge(job) {
    if (!job.salaryMax && !job.salaryMin) {
      return '<span class="badge badge-gray">Salary not stated</span>';
    }
    return '<span class="badge badge-teal">SAR ' + fmt(job.salaryMin) + '–' + fmt(job.salaryMax) + '</span>';
  }

  function bdRow(label, val) {
    return '<div class="bd-row"><span>' + label + '</span>' +
      '<div class="progress"><div style="width:' + val + '%"></div></div><b>' + val + '</b></div>';
  }

  function boostRow(boost) {
    return '<div class="bd-row"><span>Learned from your activity</span>' +
      '<div class="progress"><div style="width:' + Math.round(boost / 8 * 100) + '%"></div></div><b>+' + boost + '</b></div>';
  }

  function catRow(c) {
    const pct = Math.round(c.score / c.max * 100);
    return '<div class="bd-row"><span>' + esc(c.label) + '</span>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div><b>' + c.score + '/' + c.max + '</b></div>';
  }

  function analysisList(res) {
    let h = '<ul class="analysis-list">';
    res.matches.forEach((m) => { h += '<li><span class="mk mk-ok">✓</span><span>' + esc(m) + '</span></li>'; });
    res.concerns.forEach((m) => { h += '<li><span class="mk mk-warn">!</span><span>' + esc(m) + '</span></li>'; });
    res.missing.forEach((m) => { h += '<li><span class="mk mk-bad">✕</span><span>' + esc(m) + '</span></li>'; });
    res.notes.forEach((m) => { h += '<li><span class="mk mk-info">i</span><span>' + esc(m) + '</span></li>'; });
    if (!res.matches.length && !res.concerns.length && !res.missing.length && !res.notes.length) {
      h += '<li class="muted">No analysis available — upload your CV first.</li>';
    }
    return h + '</ul>';
  }

  function emptyState(title, sub) {
    return '<div class="card empty"><div class="ic">🔍</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div>';
  }

  function select(key, options) {
    const cur = state.filters[key] || '';
    let h = '<select class="input" onchange="App.setFilter(\'' + key + '\', this.value)">';
    h += '<option value="">All</option>';
    options.forEach((o) => {
      h += '<option value="' + esc(o) + '"' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>';
    });
    return h + '</select>';
  }

  /* ============================================================
     Cover letter generator
     ============================================================ */
  function buildLetter(job, res, p) {
    const hasProfile = !!(p.fullName || p.profession || p.years != null);
    const name = p.fullName || '[Your full name]';
    const contact = [p.email || '[email]', p.phone || '[phone]'].filter(Boolean).join(' · ');
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const prof = p.profession || 'medical professional';
    const focus = p.specialty ? ' with a focus on ' + p.specialty : '';
    const years = (p.years != null && p.years !== '' && p.years > 0)
      ? p.years + ' years of clinical experience'
      : 'several years of clinical experience';

    const paras = [];
    paras.push('Dear Hiring Team at ' + job.employer + ',');
    paras.push(
      'I am writing to apply for the position of ' + job.title + ' in ' + job.city +
      (job.source ? ', as advertised via ' + job.source.replace(/\s*\(Live\)/, '') : '') + '. As a ' +
      prof + focus + ' with ' + years + ', I am confident I can contribute effectively to your team.'
    );

    const matches = (res.matches || []).slice(0, 4).map((m) => '- ' + m.replace(/\.$/, '') + '.');
    if (matches.length) {
      paras.push('My background aligns closely with your requirements:\n' + matches.join('\n'));
    } else {
      paras.push('My clinical experience in hospital and clinic settings aligns closely with the requirements of this role.');
    }

    const lic = [];
    if (p.scfhsRegistration === 'Yes') lic.push('active SCFHS registration');
    else if (p.scfhsClassification === 'Yes') lic.push('SCFHS classification');
    if (p.dataflow === 'Completed') lic.push('completed DataFlow primary-source verification');
    else if (p.dataflow) lic.push('DataFlow verification (' + p.dataflow.toLowerCase() + ')');
    if ((p.certs || []).length) lic.push(p.certs.slice(0, 3).join(', ') + ' certification' + (p.certs.length > 1 ? 's' : ''));
    if (lic.length) {
      paras.push('Regarding licensing, I hold ' + lic.join(', ') + ' — all documentation is ready for your verification process.');
    }

    const skillsHave = (p.skills || []).map((s) => s.toLowerCase());
    const overlap = (job.skills || []).filter((s) => skillsHave.indexOf(s.toLowerCase()) !== -1).slice(0, 5);
    if (overlap.length) {
      paras.push('Key skills I would bring to the role include ' + overlap.join(', ') + '.');
    }

    paras.push(
      'I would welcome the opportunity to discuss how my experience can benefit ' + job.employer +
      '. I am available for an interview at your convenience and can be reached at ' +
      (p.email || '[email]') + (p.phone ? ' or ' + p.phone : '') + '.'
    );
    paras.push('Thank you for your time and consideration.');
    paras.push('Kind regards,\n' + name);

    const header = name + '\n' + contact + '\n' + date + '\n\n';
    const note = hasProfile ? ''
      : '*** NOTE: upload your CV on the Upload CV page first — this draft uses placeholders. ***\n\n';
    return note + header + paras.join('\n\n');
  }

  function coverLetterView(id) {
    const item = scoredJobs().find((x) => x.job.id === id);
    if (!item) return;
    const job = item.job;
    const letter = buildLetter(job, item.res, state.profile);
    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal modal-lg">' +
      '<div class="flex between"><div><h3 style="margin:0">✉ Cover letter</h3>' +
      '<div class="job-emp">' + esc(job.title) + ' · ' + esc(job.employer) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<p class="muted mt" style="font-size:.85rem">Drafted from your profile and this job\'s real match points. Review and personalize it before sending.</p>' +
      '<textarea class="input" id="letterText" style="min-height:340px;font-size:.9rem;line-height:1.6">' + esc(letter) + '</textarea>' +
      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.copyLetter()">Copy letter</button>' +
      '<button class="btn btn-outline" onclick="App.openJob(\'' + job.id + '\')">← Back to analysis</button>' +
      '</div></div></div>';
  }

  /* ============================================================
     Interview prep generator
     ============================================================ */
  const SKILL_QUESTIONS = [
    [/\bopd\b|outpatient/i, 'How many OPD patients per day have you managed, and how do you keep consultations both safe and efficient?'],
    [/emergency/i, 'Describe your approach to the first five minutes with an undifferentiated emergency patient.'],
    [/triage/i, 'Walk us through how you triage a busy waiting room — what makes someone jump the queue?'],
    [/chronic disease/i, 'How do you structure long-term follow-up for a patient with poorly controlled chronic disease?'],
    [/diabetes/i, 'Outline your stepwise management of a type 2 diabetic whose HbA1c stays above target.'],
    [/hypertension/i, 'When do you escalate antihypertensive therapy, and how do you investigate secondary causes?'],
    [/minor surgery|minor procedures/i, 'Which minor procedures do you perform independently, and what are your safety and consent steps?'],
    [/telemedicine/i, 'How do you keep remote consultations safe — red flags, examination limits, documentation, e-prescribing rules?'],
    [/vaccination|immuniz/i, 'How do you handle a vaccine-hesitant parent, and what do you check before administering?'],
    [/wound care/i, 'Describe your wound assessment approach and when you would refer for surgical review.'],
    [/icu|critical care|ventilator/i, 'Describe your experience with ventilated patients — settings you adjust and alarms you never ignore.'],
    [/iv therapy|medication administration/i, 'Tell us about a medication-safety practice you follow without exception.'],
    [/ecg/i, 'A patient\'s ECG shows ST elevation — walk us through your immediate actions.'],
    [/pediatric/i, 'A febrile 18-month-old is brought in — what are your red flags and initial management?'],
    [/dispensing|medication review/i, 'Tell us about a time you caught a prescribing or dispensing problem. What did you do?'],
    [/infection control/i, 'Which infection-control practices do you personally own in your current workplace?'],
    [/patient education/i, 'How do you explain a new chronic diagnosis so a patient actually follows the plan?'],
    [/health screening/i, 'How do you structure an executive health screening, and what do you do with an abnormal finding?']
  ];

  const PROF_QUESTIONS = {
    'General Practitioner': [
      'A patient insists on antibiotics for a viral illness — how do you handle it?',
      'How do you decide when to refer a patient to a specialist?',
      'How do you manage a patient with multiple chronic conditions in a 15-minute consultation?'
    ],
    'Nurse': [
      'Tell us about a time you escalated a deteriorating patient — what did you notice and what did you do?',
      'Describe a medication near-miss you were involved in and what changed afterward.',
      'How do you handle a distressed family while keeping care on schedule?'
    ],
    'Pharmacist': [
      'Walk us through how you catch a significant drug interaction.',
      'How do you counsel a patient who is not adhering to their medications?',
      'What is your role in antibiotic stewardship?'
    ],
    'Dentist': [
      'How do you manage a severely anxious dental patient?',
      'Describe your infection-control routine between patients.'
    ]
  };

  const SAUDI_QUESTIONS = [
    'What is your current licensing status (e.g. SCFHS classification/registration, number, and expiry)?',
    'Where are you in the primary-source verification (DataFlow) process?',
    'Do you have previous experience working in this country or the region?',
    'What is your availability and notice period? When could you start?',
    'What are your salary expectations? (Tip: anchor to the posted range if one is shown.)',
    'Why this country, and why this city specifically?'
  ];

  const BEHAVIORAL_QUESTIONS = [
    'Tell me about yourself. (Structure: current role → key experience → why this job. 60–90 seconds, no more.)',
    'Describe a clinical error or near-miss and what you changed afterward.',
    'Tell us about a difficult patient or colleague situation and how you resolved it.',
    'Where do you see yourself in three to five years?'
  ];

  const ASK_THEM = [
    'What does the typical daily patient volume and case mix look like?',
    'How is the on-call rota and shift structure organized?',
    'What support do you provide for licensing, primary-source verification, and visa processing?',
    'Is there a CME allowance or protected training time?',
    'What onboarding is provided for international hires — flights, accommodation, orientation?',
    'How is performance measured and reviewed in this role?'
  ];

  function reqToQuestion(r) {
    if (/scfhs|regist|licen[cs]/i.test(r)) return 'What is your current licensing status — classification, registration number, and expiry?';
    if (/dataflow|prometric|smle/i.test(r)) return 'Where are you in the DataFlow / Prometric process, and which documents are ready?';
    if (/bls|acls|atls|pals|certif/i.test(r)) return 'Which life-support certifications do you hold, when do they expire, and when did you last use them?';
    if (/mbbs|bds|degree|pharmd|bsc|md\b/i.test(r)) return 'Walk us through your medical education and any postgraduate training.';
    if (/saudi/i.test(r)) return 'Tell us about your previous work in the region — settings, caseload, and what you learned.';
    if (/experience/i.test(r)) return 'Walk us through your experience relevant to this: "' + r + '"';
    return 'How does your background prepare you for this requirement: "' + r + '"?';
  }

  function interviewPrep(job, res) {
    const roleQs = [];
    (job.requirements || []).slice(0, 4).forEach((r) => {
      const q = reqToQuestion(r);
      if (roleQs.indexOf(q) === -1) roleQs.push(q);
    });
    (job.skills || []).forEach((s) => {
      const hit = SKILL_QUESTIONS.find((pair) => pair[0].test(s));
      if (hit && roleQs.indexOf(hit[1]) === -1 && roleQs.length < 7) roleQs.push(hit[1]);
    });
    const bank = PROF_QUESTIONS[job.profession] || [];
    bank.forEach((q) => { if (roleQs.length < 8) roleQs.push(q); });
    if (!roleQs.length) {
      roleQs.push('Walk us through your clinical experience and the settings you have worked in.',
        'Which cases do you manage most confidently, and which do you refer?');
    }

    const talking = (res.matches || []).slice(0, 5);
    const gaps = (res.missing || []).slice(0, 4);
    return { roleQs, talking, gaps };
  }

  let lastPrepText = '';

  function interviewPrepView(id) {
    const item = scoredJobs().find((x) => x.job.id === id);
    if (!item) return;
    const job = item.job, res = item.res;
    const prep = interviewPrep(job, res);

    const li = (arr, mk, cls) => arr.map((q) =>
      '<li><span class="mk ' + cls + '">' + mk + '</span><span>' + esc(q) + '</span></li>').join('');

    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal modal-lg">' +
      '<div class="flex between"><div><h3 style="margin:0">🎤 Interview prep</h3>' +
      '<div class="job-emp">' + esc(job.title) + ' · ' + esc(job.employer) + ' · ' + esc(job.city) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +

      '<h4 class="mt">Likely questions — from this job\'s requirements</h4>' +
      '<ul class="analysis-list">' + li(prep.roleQs, '?', 'mk-info') + '</ul>' +

      '<h4 class="mt">Licensing &amp; logistics (expect all of these)</h4>' +
      '<ul class="analysis-list">' + li(SAUDI_QUESTIONS, '؟', 'mk-info') + '</ul>' +

      '<h4 class="mt">Behavioral</h4>' +
      '<ul class="analysis-list">' + li(BEHAVIORAL_QUESTIONS, '?', 'mk-info') + '</ul>' +

      (prep.talking.length
        ? '<h4 class="mt">💪 Your talking points (from your match analysis)</h4>' +
          '<ul class="analysis-list">' + li(prep.talking.map((m) => 'Emphasize: ' + m), '✓', 'mk-ok') + '</ul>'
        : '') +

      (prep.gaps.length
        ? '<h4 class="mt">⚠ Be ready to address</h4>' +
          '<ul class="analysis-list">' + li(prep.gaps.map((g) => g), '!', 'mk-warn') + '</ul>' +
          '<p class="muted" style="font-size:.85rem">Framing: don\'t be defensive. State your current status honestly, ' +
          'show adjacent experience, and give a concrete plan or timeline to close the gap (e.g. "verification is in progress, ' +
          'documents submitted on…").</p>'
        : '') +

      '<h4 class="mt">🙋 Questions to ask them</h4>' +
      '<ul class="analysis-list">' + li(ASK_THEM, '→', 'mk-ok') + '</ul>' +

      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.copyPrep()">Copy prep sheet</button>' +
      '<button class="btn btn-outline" onclick="App.openJob(\'' + job.id + '\')">← Back to analysis</button>' +
      '</div></div></div>';

    lastPrepText =
      'INTERVIEW PREP — ' + job.title + ' @ ' + job.employer + ' (' + job.city + ')\n\n' +
      'LIKELY QUESTIONS (role-specific):\n' + prep.roleQs.map((q) => '- ' + q).join('\n') + '\n\n' +
      'LICENSING & LOGISTICS:\n' + SAUDI_QUESTIONS.map((q) => '- ' + q).join('\n') + '\n\n' +
      'BEHAVIORAL:\n' + BEHAVIORAL_QUESTIONS.map((q) => '- ' + q).join('\n') + '\n\n' +
      (prep.talking.length ? 'YOUR TALKING POINTS:\n' + prep.talking.map((m) => '- ' + m).join('\n') + '\n\n' : '') +
      (prep.gaps.length ? 'BE READY TO ADDRESS:\n' + prep.gaps.map((g) => '- ' + g).join('\n') + '\n\n' : '') +
      'QUESTIONS TO ASK THEM:\n' + ASK_THEM.map((q) => '- ' + q).join('\n');
  }

  /* ============================================================
     CV / ATS analyzer
     ============================================================ */
  const ACTION_VERBS = ['managed', 'led', 'provided', 'performed', 'delivered', 'implemented',
    'improved', 'reduced', 'achieved', 'supervised', 'coordinated', 'developed', 'established',
    'conducted', 'trained', 'assessed', 'diagnosed', 'treated', 'administered', 'monitored',
    'initiated', 'streamlined', 'mentored', 'reviewed', 'launched', 'authored', 'presented'];

  function analyzeCv(text, profile) {
    const t = text || '';
    const lines = t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const words = t.split(/\s+/).filter(Boolean).length;
    const bullets = lines.filter((l) => /^[-•*▪◦]/.test(l)).length;
    const dateRanges = (t.match(/(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current|now)/gi) || []).length;
    const quants = (t.match(/\d+\s*(%|percent|patients?|cases|procedures|beds|visits|per day|\/day|\/week)/gi) || []).length;
    const verbsFound = ACTION_VERBS.filter((v) => new RegExp('\\b' + v, 'i').test(t));
    const vocab = (typeof SKILLS_VOCAB !== 'undefined') ? SKILLS_VOCAB : [];
    const skillsFound = vocab.filter((s) => new RegExp('\\b' + escRe(s) + '\\b', 'i').test(t));
    const sections = {
      'Summary / objective': /(professional\s+)?(summary|profile|objective)/i.test(t),
      'Work experience': /((work|professional|clinical)\s+)?(experience|employment history)/i.test(t),
      'Education': /education|academic qualific/i.test(t),
      'Skills': /skills|competencies/i.test(t),
      'Licensing / certifications': /licen[cs]|certification|credential/i.test(t)
    };

    const cats = [];
    const strong = [];
    const weak = [];
    const W = (sev, title, detail) => weak.push({ sev, title, detail });

    let c = 0;
    if (profile.email) c += 6;
    if (profile.phone) c += 6;
    if (profile.fullName) c += 3;
    cats.push({ label: 'Contact information', score: c, max: 15 });
    if (c === 15) strong.push('Complete contact block (name, email, phone) — ATS parsers read this first.');
    if (!profile.email) W('high', 'No email detected', 'Put a professional email at the very top, under your name. Without it, ATS software may misfile the whole CV.');
    if (!profile.phone) W('high', 'No phone number detected', 'Add a phone number with country code. Recruiters in the region commonly contact candidates by phone/WhatsApp.');
    if (!profile.fullName) W('medium', 'Name not clearly detected', 'Make sure your full name is the first line of the CV, on its own line.');

    const secFound = Object.values(sections).filter(Boolean).length;
    cats.push({ label: 'Standard section headings', score: secFound * 3, max: 15 });
    if (secFound >= 4) strong.push('Clear section structure (' + secFound + ' of 5 standard headings found) — ATS-friendly layout.');
    Object.keys(sections).forEach((name) => {
      if (!sections[name]) W('medium', 'Missing section: ' + name,
        'Add a clearly-labelled "' + name + '" heading. ATS parsers look for standard section names; creative headings get missed.');
    });

    let lenScore = 2;
    if (words >= 250 && words <= 1200) lenScore = 10;
    else if (words >= 150 || words <= 2000) lenScore = 6;
    cats.push({ label: 'Length (' + words + ' words)', score: lenScore, max: 10 });
    if (lenScore === 10) strong.push('Good length (~' + words + ' words) — within the 1–2 page range recruiters and parsers prefer.');
    if (words < 250) W('medium', 'CV is very short (' + words + ' words)', 'Aim for 1–2 pages: expand education, licensing, each role\'s responsibilities and skills. Thin CVs score poorly in keyword matching.');
    if (words > 2000) W('low', 'CV is very long (' + words + ' words)', 'Trim to 2 pages. Keep the most recent 10–15 years of experience and cut repeated duties.');

    const bulletScore = bullets >= 5 ? 10 : (bullets >= 1 ? 5 : 0);
    cats.push({ label: 'Bullet-point formatting', score: bulletScore, max: 10 });
    if (bullets >= 5) strong.push('Responsibilities use bullet points (' + bullets + ' found) — easy for recruiters and parsers to scan.');
    if (bullets === 0) W('medium', 'No bullet points detected', 'Convert responsibility paragraphs into bullets starting with "- ". Bullets parse far better in ATS systems and scan faster for humans.');

    const dateScore = dateRanges >= 2 ? 10 : (dateRanges === 1 ? 6 : 0);
    cats.push({ label: 'Dates on roles', score: dateScore, max: 10 });
    if (dateRanges >= 2) strong.push('Roles carry clear date ranges (' + dateRanges + ' found) — chronology is easy to verify.');
    if (dateRanges === 0) W('high', 'No date ranges detected', 'Add a date range to every role, e.g. "2021 - Present". ATS systems and employers both screen for continuous, verifiable chronology.');
    else if (dateRanges === 1) W('medium', 'Only one dated role found', 'Give every position a start and end date (MM/YYYY). Undated roles look like gaps.');

    const sk = skillsFound.length;
    const kwScore = sk >= 8 ? 15 : (sk >= 5 ? 11 : (sk >= 3 ? 7 : (sk >= 1 ? 3 : 0)));
    cats.push({ label: 'Clinical keywords (' + sk + ' found)', score: kwScore, max: 15 });
    if (sk >= 5) strong.push(sk + ' clinical keywords detected (' + skillsFound.slice(0, 4).join(', ') + '…) — good ATS keyword coverage.');
    if (sk < 3) W('high', 'Very few clinical keywords (' + sk + ')', 'Mirror the vocabulary of the job postings you target: list concrete skills like OPD, triage, chronic disease management, ECG interpretation. Keyword match is the core of ATS ranking.');

    const qScore = quants >= 3 ? 10 : (quants >= 1 ? 6 : 0);
    cats.push({ label: 'Quantified achievements', score: qScore, max: 10 });
    if (quants >= 3) strong.push('Achievements are quantified (' + quants + ' numbers with units) — measurable results stand out.');
    if (quants === 0) W('medium', 'No quantified achievements', 'Add numbers: "managed 40+ OPD patients/day", "reduced waiting time by 20%". Numbers make experience credible to both ATS and recruiters.');

    const vScore = verbsFound.length >= 5 ? 10 : (verbsFound.length >= 3 ? 7 : (verbsFound.length >= 1 ? 4 : 0));
    cats.push({ label: 'Action verbs (' + verbsFound.length + ' found)', score: vScore, max: 10 });
    if (verbsFound.length >= 5) strong.push('Strong action verbs throughout (' + verbsFound.slice(0, 4).join(', ') + '…).');
    if (verbsFound.length <= 1) W('low', 'Few action verbs', 'Start each bullet with a verb: managed, provided, performed, implemented, supervised, reduced. Avoid "responsible for…".');

    if (profile.scfhsRegistration === 'Yes') strong.push('Professional registration stated — the #1 filter employers apply.');
    else W('high', 'Professional registration status missing', 'State your licensing/registration status (e.g. SCFHS for Saudi Arabia, with number and expiry) in a dedicated Licensing section near the top. Most employers filter on this before reading further.');
    if (profile.dataflow === 'Completed') strong.push('Primary-source verification (DataFlow) mentioned — removes a common hiring delay.');
    else if (!profile.dataflow) W('medium', 'Verification status missing', 'Add your primary-source verification (e.g. DataFlow) status — it is a standard hiring step in the Gulf.');
    if ((profile.certs || []).length) strong.push('Certifications listed: ' + profile.certs.join(', ') + '.');

    const score = cats.reduce((s, x) => s + x.score, 0);
    const sevRank = { high: 0, medium: 1, low: 2 };
    weak.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
    return { score, cats, strong, weak, words };
  }

  function atsLabel(score) {
    if (score >= 85) return ['Excellent — ATS-ready', 'green'];
    if (score >= 70) return ['Good — minor fixes', 'teal'];
    if (score >= 50) return ['Needs work', 'amber'];
    return ['Poor — likely filtered out', 'red'];
  }

  function analysisView() {
    if (!state.cvText) {
      return '<section class="section"><div class="container" style="max-width:820px">' +
        emptyState('No CV to analyze', 'Upload or paste your CV first — the ATS report is generated from your CV text, right in your browser.') +
        '<div class="center"><button class="btn btn-primary" onclick="App.go(\'upload\')">Upload your CV</button></div>' +
        '</div></section>';
    }
    const a = analyzeCv(state.cvText, state.profile);
    const pair = atsLabel(a.score);
    const mark = { high: ['mk-bad', '✕'], medium: ['mk-warn', '!'], low: ['mk-info', 'i'], ok: ['mk-ok', '✓'] };
    const saudiTips = Engine.improvementTips(state.profile, state.cvText);

    let h = '<section class="section"><div class="container">' +
      '<div class="dash-head"><div><h2 style="margin:0">CV Analysis</h2>' +
      '<p class="muted" style="margin:4px 0 0">ATS compatibility report · ' + a.words + ' words analyzed</p></div>' +
      '<button class="btn btn-outline" onclick="App.go(\'upload\')">Update CV</button></div>' +

      '<div class="grid grid-2">' +
      '<div class="card"><div class="flex between"><h3 style="margin:0">ATS score</h3>' +
      '<div class="ring-wrap">' + ring(a.score, pair[1]) + '<span class="badge badge-' + pair[1] + '">' + pair[0] + '</span></div></div>' +
      '<div class="progress mt"><div style="width:' + a.score + '%"></div></div>' +
      '<h4 class="mt-lg">Category breakdown</h4>' +
      a.cats.map(catRow).join('') + '</div>' +

      '<div class="card"><h3>💪 Strong points</h3>' +
      (a.strong.length
        ? '<ul class="analysis-list">' + a.strong.map((s) => '<li><span class="mk mk-ok">✓</span><span>' + esc(s) + '</span></li>').join('') + '</ul>'
        : '<p class="muted">No strong points detected yet — work through the fixes below.</p>') +
      '</div></div>' +

      '<div class="card mt-lg"><h3>⚠ Weak points &amp; recommended fixes</h3>' +
      (a.weak.length
        ? '<ul class="analysis-list">' + a.weak.map((w) => {
            const m = mark[w.sev] || mark.low;
            return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(w.title) + '</b> ' +
              '<span class="prov ' + (w.sev === 'high' ? 'prov-missing' : (w.sev === 'medium' ? 'prov-ai' : 'prov-user')) + '">' + w.sev + '</span>' +
              '<br><span class="muted">' + esc(w.detail) + '</span></span></li>';
          }).join('') + '</ul>'
        : '<p class="muted">No weak points detected — excellent.</p>') +
      '</div>' +

      '<div class="card mt-lg"><h3>📋 Employer checklist</h3>' +
      '<p class="muted">Beyond ATS formatting, employers in the current coverage area screen for these specifically:</p>' +
      '<ul class="analysis-list">' + saudiTips.map((t) => {
        const m = mark[t.sev] || mark.low;
        return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(t.title) + '</b><br><span class="muted">' + esc(t.detail) + '</span></span></li>';
      }).join('') + '</ul></div>' +

      '<div class="card mt-lg" style="background:#f0faf8;border-color:#c7e8e2"><h3>How the score works</h3>' +
      '<p class="muted" style="margin:0">The report runs entirely in your browser. It checks what applicant tracking systems parse ' +
      '(contact block, standard headings, dates, keywords, bullets) and what healthcare recruiters screen for ' +
      '(licensing, verification, certifications, quantified clinical experience). Fix the high-severity items first — each one ' +
      'visibly raises your match scores on the Jobs page.</p></div>' +
      '</div></section>';
    return h;
  }

  /* ---------- nav / footer ---------- */
  function navLink(route, label) {
    return '<a href="#" class="' + (state.route === route ? 'active' : '') + '" onclick="App.go(\'' + route + '\');return false;">' + label + '</a>';
  }

  function unreadNotifs() {
    if (!currentUser) return [];
    return topMatches(3).filter(({ job }) => state.notifsReadIds.indexOf(job.id) === -1);
  }

  function notifsView() {
    let h = '<div class="notif-item" style="display:flex;justify-content:space-between;align-items:center;background:#fff;position:sticky;top:0">' +
      '<b>Notifications</b>' +
      (unreadNotifs().length ? '<button class="btn btn-ghost btn-sm" onclick="App.markNotifsRead(event)">Mark all read</button>' : '') +
      '</div>';
    if (!currentUser) {
      h += '<div class="notif-item">🔒 <b>Sign in</b> to get match alerts personalized to your CV.</div>' +
        '<div class="notif-item" style="cursor:pointer" onclick="App.closeMenus();App.openAuth(\'signup\')"><b>Create a free ' + acctWord() + ' →</b></div>';
      return h;
    }
    const top = topMatches(3);
    if (!top.length) {
      h += '<div class="notif-item muted">No matches yet — analyze your CV to see personalized matches.</div>';
    } else {
      h += top.map(({ job, res }) => {
        const isNew = state.notifsReadIds.indexOf(job.id) === -1;
        return '<div class="notif-item' + (isNew ? ' unread' : '') + '" style="cursor:pointer" title="Open job analysis" onclick="App.openNotif(\'' + job.id + '\')">' +
          '<b>' + res.final + '% match</b> — ' + esc(job.title) +
          '<br><span class="muted">' + esc(job.employer) + ' · ' + esc(job.city) + '</span></div>';
      }).join('');
    }
    h += '<div class="notif-item muted" style="font-size:.78rem">💡 Tip: run the CV Analysis page to raise your match scores.</div>';
    return h;
  }

  function accountArea() {
    if (!currentUser) {
      return '<button class="btn btn-outline btn-sm" onclick="App.openAuth(\'signin\')">Sign in</button>' +
        '<button class="btn btn-primary btn-sm" onclick="App.openAuth(\'signup\')">Sign up</button>';
    }
    const initials = currentUser.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U';
    return '<div class="user-menu">' +
      '<button class="avatar" title="Account" onclick="App.toggleAccountMenu(event)">' + esc(initials) + '</button>' +
      '<div class="menu hidden" id="acctMenu">' +
      '<div style="padding:9px 12px;border-bottom:1px solid var(--line)"><b>' + esc(currentUser.name) + '</b><br>' +
      '<small class="muted">' + esc(currentUser.email) + (currentUser.cloud ? ' · ☁ synced' : '') + '</small></div>' +
      '<button onclick="App.closeMenus();App.go(\'dashboard\')">📊 Dashboard</button>' +
      '<button onclick="App.closeMenus();App.go(\'analysis\')">📄 CV Analysis</button>' +
      '<button onclick="App.signOut()">↩ Sign out</button>' +
      '</div></div>';
  }

  function navView() {
    const unread = unreadNotifs().length;
    return '<nav class="nav"><div class="nav-inner">' +
      '<button class="burger" onclick="App.toggleMenu()" aria-label="Menu">☰</button>' +
      '<a class="brand" href="#" onclick="App.go(\'home\');return false;"><span class="logo">✚</span>Med<em>Match</em></a>' +
      '<div class="nav-links" id="navLinks">' +
      navLink('home', 'Home') + navLink('jobs', 'Jobs') + navLink('upload', 'Upload CV') +
      navLink('analysis', 'CV Analysis') + navLink('dashboard', 'Dashboard') +
      '</div><div class="nav-cta"><div class="user-menu">' +
      '<button class="bell" onclick="App.toggleBell(event)" title="Notifications">🔔' + (unread ? '<span class="dot">' + unread + '</span>' : '') + '</button>' +
      '<div class="notif-panel hidden" id="notifPanel">' + notifsView() + '</div>' +
      '</div>' +
      accountArea() +
      '</div></div></nav>';
  }

  function footerView() {
    return '<footer class="footer"><div class="container"><div class="cols">' +
      '<div><h5>MedMatch</h5><p>AI-matched healthcare jobs. Currently covering Saudi Arabia — more countries planned. Jobs are aggregated from live sources; always verify details with the employer.</p></div>' +
      '<div><h5>Product</h5><ul>' +
      '<li><a href="#" onclick="App.go(\'jobs\');return false;">Jobs</a></li>' +
      '<li><a href="#" onclick="App.go(\'upload\');return false;">Upload CV</a></li>' +
      '<li><a href="#" onclick="App.go(\'analysis\');return false;">CV Analysis</a></li>' +
      '<li><a href="#" onclick="App.go(\'dashboard\');return false;">Dashboard</a></li></ul></div>' +
      '<div><h5>Licensing</h5><ul><li>SCFHS classification</li><li>DataFlow verification</li><li>Prometric / SMLE</li></ul></div>' +
      '<div><h5>Legal</h5><ul><li><a href="privacy.html">Privacy Policy</a></li></ul>' +
      '<h5 style="margin-top:12px">Data</h5><ul><li>' + JOB_SOURCES.length + ' sources</li><li>' + DEMO_JOBS.length + ' jobs loaded</li></ul></div>' +
      '</div><p style="margin:0">© 2026 MedMatch. Job listings belong to their original sources.</p></div></footer>';
  }

  /* ---------- auth modal ---------- */
  function authView(mode) {
    const isUp = mode === 'signup';
    const cloud = cloudEnabled();
    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal">' +
      '<div class="flex between"><h3 style="margin:0">' + (isUp ? 'Create your account' : 'Welcome back') + '</h3>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<div class="tabs mt">' +
      '<a href="#" class="' + (!isUp ? 'active' : '') + '" onclick="App.openAuth(\'signin\');return false;">Sign in</a>' +
      '<a href="#" class="' + (isUp ? 'active' : '') + '" onclick="App.openAuth(\'signup\');return false;">Sign up</a></div>' +
      (isUp ? '<div class="field"><label>Your name</label><input class="input" id="authName" placeholder="e.g. Dr. Sara Ahmed"></div>' : '') +
      '<div class="field"><label>Email</label><input class="input" id="authEmail" type="email" placeholder="you@example.com" onkeydown="if(event.key===\'Enter\')App.submitAuth(\'' + mode + '\')"></div>' +
      (cloud
        ? ''
        : '<div class="field"><label>Password <span class="hint">(anything — stored nowhere; this is a local demo account)</span></label>' +
          '<input class="input" id="authPass" type="password" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')App.submitAuth(\'' + mode + '\')"></div>') +
      '<div id="authErr" class="hidden" style="color:var(--red);font-size:.85rem;margin-bottom:10px"></div>' +
      '<button class="btn btn-primary btn-block" onclick="App.submitAuth(\'' + mode + '\')">' +
      (cloud ? '📬 Email me a sign-in link' : (isUp ? 'Create account' : 'Sign in')) + '</button>' +
      '<p class="muted mt" style="font-size:.78rem;margin:10px 0 0">' +
      (cloud
        ? 'No password needed — we email you a magic link. Your CV, saved jobs and preferences sync securely across your devices (row-level security; only you can read your data). Includes a weekly job-match email — turn it off anytime in Dashboard → Preferences.'
        : 'Accounts are stored only in this browser (no server). Each account has its own CV, saved jobs and preferences. Nothing personal is stored or shown without an account.') +
      ' By continuing you agree to our <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>' +
      '</div></div>';
  }

  /* ---------- auth gate ---------- */
  const GATED = { upload: 1, analysis: 1, dashboard: 1 };

  function lockedView(route) {
    const names = { upload: 'Upload CV', analysis: 'CV Analysis', dashboard: 'Dashboard' };
    return '<section class="section"><div class="container" style="max-width:560px">' +
      '<div class="card empty"><div class="ic">🔒</div>' +
      '<h3>' + (names[route] || 'This page') + ' requires an account</h3>' +
      '<p>Your CV and personal data live only inside your account — never visible to guests ' +
      'or to anyone else using this ' + (cloudEnabled() ? 'device. Sign in on any device and everything follows you.' : 'browser. Sign in or create a free local account to continue.') + '</p>' +
      '<div class="flex mt" style="justify-content:center">' +
      '<button class="btn btn-primary" onclick="App.openAuth(\'signup\')">Create account</button>' +
      '<button class="btn btn-outline" onclick="App.openAuth(\'signin\')">Sign in</button></div>' +
      '<p class="muted mt" style="font-size:.8rem">' +
      (cloudEnabled() ? 'Magic-link sign-in — no passwords, nothing to remember.' : 'Accounts are stored only in this browser — no server, nothing is uploaded anywhere.') +
      '</p></div></div></section>';
  }

  /* ---------- views ---------- */
  function step(n, title, text) {
    return '<div class="card hover"><div class="step-num">' + n + '</div><h3>' + title + '</h3><p class="muted">' + text + '</p></div>';
  }

  function homeView() {
    const strength = Engine.profileStrength(state.profile);
    return '<section class="hero"><div class="container hero-grid"><div>' +
      '<span class="eyebrow">⚡ AI-matched healthcare jobs</span>' +
      '<h1>Find the healthcare job that matches <span style="color:var(--teal-d)">your</span> CV</h1>' +
      '<p class="lead">Create a free ' + acctWord() + ', upload your CV, and let the matching engine score live healthcare jobs — currently covering Saudi Arabia — against your qualifications, experience, licensing status and career goals.</p>' +
      '<div class="flex wrap mt">' +
      (currentUser
        ? '<button class="btn btn-primary btn-lg" onclick="App.go(\'upload\')">Upload your CV</button>'
        : '<button class="btn btn-primary btn-lg" onclick="App.openAuth(\'signup\')">Create free account</button>') +
      '<button class="btn btn-outline btn-lg" onclick="App.go(\'jobs\')">Browse jobs</button></div>' +
      '<div class="stats-row">' +
      '<div class="stat"><b>' + DEMO_JOBS.length + '</b><span>Live jobs</span></div>' +
      '<div class="stat"><b>' + JOB_SOURCES.length + '</b><span>Sources</span></div>' +
      '<div class="stat"><b>' + (CITIES.length - 1) + '</b><span>Cities</span></div>' +
      '<div class="stat"><b>' + (PROFESSIONS.length - 1) + '</b><span>Professions</span></div>' +
      '</div></div>' +
      '<div class="hero-card"><div class="flex between"><h3 style="margin:0">Your profile strength</h3>' + ring(strength, 'teal') + '</div>' +
      '<div class="progress mt"><div style="width:' + strength + '%"></div></div>' +
      '<p class="muted mt">' + (currentUser
        ? (state.cvText
          ? 'Profile built from your CV. Visit the dashboard to see how to improve it.'
          : 'Signed in. Upload or paste your CV to get personalized match scores.')
        : 'Sign in and upload your CV — your profile strength and personal match scores appear here.') + '</p>' +
      (currentUser
        ? '<button class="btn btn-blue btn-block" onclick="App.go(\'dashboard\')">Go to dashboard</button>'
        : '<button class="btn btn-blue btn-block" onclick="App.openAuth(\'signin\')">Sign in</button>') +
      '</div></div></section>' +
      '<section class="section"><div class="container">' +
      '<h2 class="center">How it works</h2><div class="grid grid-3 mt-lg">' +
      step(1, 'Create an account & upload your CV', cloudEnabled()
        ? 'Sign in with a magic email link — no password. The engine extracts your profession, experience, skills and licensing status, and everything syncs across your devices.'
        : 'Accounts live only in your browser. The engine extracts your profession, experience, skills and licensing status (registration, verification, exams).') +
      step(2, 'Get scored matches', 'Every job is scored 0–100 across profession, qualifications, experience, licensing, skills, location and salary — plus AI semantic similarity when available.') +
      step(3, 'Apply with confidence', 'See exactly what matches, what is missing, and how to strengthen your CV for employers.') +
      '</div></div></section>';
  }

  /* ============================================================
     Jobs view — guests get a teaser, members get everything
     ============================================================ */
  const GUEST_JOB_LIMIT = 6;

  function jobsView() {
    const all = filteredJobs();
    const isGuest = !currentUser;
    const list = isGuest ? all.slice(0, GUEST_JOB_LIMIT) : all;
    const hidden = all.length - list.length;

    return '<section class="section"><div class="container">' +
      '<div class="dash-head"><div><h2 style="margin:0">Matched jobs</h2>' +
      '<p class="muted" style="margin:4px 0 0">' +
      (isGuest
        ? 'Showing ' + list.length + ' of ' + all.length + ' jobs — <a href="#" onclick="App.openAuth(\'signup\');return false;">create a free account</a> to unlock employer names, salaries, match scores and apply links'
        : all.length + ' of ' + DEMO_JOBS.length + ' jobs · sorted by match score' +
          (embState.ready ? ' · <span class="prov prov-ai">AI similarity on</span>' : '')) +
      '</p></div></div>' +
      '<div class="ai-search"><div class="field" style="margin:0"><label>🤖 Ask in plain English</label>' +
      '<input class="input" id="nlInput" placeholder=\'e.g. "GP jobs in Riyadh above 12000 suitable for my CV"\' value="' + esc(state.filters.nl) + '" onkeydown="if(event.key===\'Enter\')App.aiSearch()">' +
      '<div class="hint mt"><button class="btn btn-primary btn-sm" onclick="App.aiSearch()">Search</button> ' +
      (state.filters.nl ? '<button class="btn btn-ghost btn-sm" onclick="App.clearNl()">Clear</button>' : '') +
      '</div></div></div>' +
      '<div class="jobs-layout"><aside class="filters card">' +
      '<h4>Profession</h4>' + select('profession', PROFESSIONS) +
      '<h4>City</h4>' + select('city', CITIES) +
      '<h4>Employment</h4>' + select('employment', EMPLOYMENT_TYPES) +
      '<h4>Min salary (SAR)</h4>' +
      '<input class="input" type="number" min="0" placeholder="e.g. 12000" value="' + esc(state.filters.minSalary) + '" onchange="App.setFilter(\'minSalary\', this.value)">' +
      '<button class="btn btn-ghost btn-sm mt" onclick="App.resetFilters()">Reset filters</button>' +
      '</aside>' +
      '<div class="grid">' +
      (list.length
        ? list.map(isGuest ? guestJobCard : jobCard).join('')
        : emptyState('No jobs match these filters', 'Try removing a filter or broadening your search.')) +
      (isGuest && hidden > 0 ? teaserWall(hidden) : '') +
      '</div></div></div></section>';
  }

  /* Guest card: hook (title, city, profession) visible — value
     (employer, salary, score, details, apply) locked behind sign-in. */
  function guestJobCard({ job }) {
    const blur = 'filter:blur(6px);user-select:none;pointer-events:none';
    return '<div class="card job-card"><div class="job-top"><div>' +
      '<p class="job-title">' + esc(job.title) + '</p>' +
      '<div class="job-emp"><span style="' + blur + '" aria-hidden="true">Al Confidential Hospital Group</span> · ' + esc(job.city) + '</div></div>' +
      '<span class="badge badge-gray" title="Sign in to see your match score">🔒 Match</span></div>' +
      '<div class="job-meta">' +
      '<span class="badge badge-gray">' + esc(job.profession) + '</span>' +
      '<span class="badge badge-blue">' + esc(job.employment) + '</span>' +
      '<span class="badge badge-teal" style="' + blur + '" aria-hidden="true">SAR 00,000–00,000</span>' +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + ' yrs</span>' +
      '</div><div class="job-actions">' +
      '<button class="btn btn-primary btn-sm" onclick="App.openAuth(\'signup\')">🔒 Sign in to view details &amp; apply</button>' +
      '<span class="muted" style="font-size:.78rem">' + posted(job.postedDaysAgo) + '</span>' +
      '</div></div>';
  }

  function teaserWall(hidden) {
    return '<div class="card empty" style="border:2px dashed var(--teal);background:#f0faf8">' +
      '<div class="ic">🔒</div>' +
      '<h3>' + hidden + ' more job' + (hidden > 1 ? 's' : '') + ' locked</h3>' +
      '<p>Create a free ' + acctWord() + ' to see every posting with employer names, salary ranges, ' +
      'your personal match scores, full analysis and direct apply links.' +
      (cloudEnabled() ? ' Sign in once — on any device — and everything follows you.' : ' Your data never leaves this browser.') + '</p>' +
      '<div class="flex mt" style="justify-content:center">' +
      '<button class="btn btn-primary" onclick="App.openAuth(\'signup\')">Create free account</button>' +
      '<button class="btn btn-outline" onclick="App.openAuth(\'signin\')">Sign in</button></div>' +
      '</div>';
  }

  function jobCard({ job, res }) {
    const pair = Engine.matchLabel(res.final);
    const color = pair[1];
    const st = state.saved[job.id];
    return '<div class="card hover job-card"><div class="job-top"><div>' +
      '<p class="job-title">' + esc(job.title) + '</p>' +
      '<div class="job-emp">' + esc(job.employer) + ' · ' + esc(job.city) + '</div></div>' +
      '<div class="ring-wrap">' + ring(res.final, color) + '<div class="ring-sub">' + matchBadge(res.final) +
      (res.semantic !== null && res.semantic !== undefined ? ' <span class="prov prov-ai">AI</span>' : '') +
      (res.boost ? ' <span class="prov prov-user" title="Boosted by your activity">+' + res.boost + '</span>' : '') +
      '</div></div></div>' +
      '<div class="job-meta">' +
      '<span class="badge badge-gray">' + esc(job.profession) + '</span>' +
      '<span class="badge badge-blue">' + esc(job.employment) + '</span>' +
      salaryBadge(job) +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + ' yrs</span>' +
      (job.applyIsDirect ? '<span class="badge badge-green">Employer site</span>' : '') +
      (job.specialty === 'Medical Insurance' ? '<span class="badge badge-violet">Insurance</span>' : '') +
      (job.demo ? '<span class="badge badge-demo">Demo</span>' : '') +
      (st ? '<span class="status-pill st-' + st + '">' + cap(st) + '</span>' : '') +
      '</div><div class="job-actions">' +
      '<button class="btn btn-primary btn-sm" onclick="App.openJob(\'' + job.id + '\')">View analysis</button>' +
      '<button class="btn btn-outline btn-sm" onclick="App.setStatus(\'' + job.id + '\',\'' + (st === 'saved' ? '' : 'saved') + '\')">' + (st === 'saved' ? 'Unsave' : 'Save') + '</button>' +
      '<span class="muted" style="font-size:.78rem">' + posted(job.postedDaysAgo) + ' · ' + esc(job.source) + '</span>' +
      '</div></div>';
  }

  function uploadView() {
    return '<section class="section"><div class="container" style="max-width:820px">' +
      '<div class="stepper">' +
      '<div class="st done" data-n="1">Paste or upload CV</div>' +
      '<div class="st ' + (state.cvText ? 'done' : '') + '" data-n="2">AI extraction</div>' +
      '<div class="st ' + (state.cvText ? 'done' : '') + '" data-n="3">Matched jobs</div></div>' +
      '<div class="card"><h2>Upload your CV</h2>' +
      '<p class="muted">Drop in your <b>PDF</b> CV, upload a <code>.txt</code> file, or paste the text below. ' +
      (cloudEnabled()
        ? 'Your CV is analyzed in your browser and stored in your account — it syncs to your other devices, and only you can read it.'
        : 'Everything is read and analyzed locally in your browser — nothing is uploaded to any server.') + '</p>' +
      '<div class="dropzone" id="dz">' +
      '<div class="ic">📄</div><b>Drop your CV here (PDF or .txt) — or click to browse</b>' +
      '<div class="hint">PDFs are read in your browser via pdf.js (needs internet once, to load the library). ' +
      'Scanned PDFs that are just photos have no text layer — copy-paste those. Word files: open, copy, paste.</div></div>' +
      '<input type="file" id="cvFile" accept=".txt,.md,.pdf" class="hidden">' +
      '<div class="field mt"><label>CV text</label>' +
      '<textarea class="input" id="cvText" placeholder="Paste your full CV text here…">' + esc(state.cvText) + '</textarea></div>' +
      '<div class="flex wrap">' +
      '<button class="btn btn-primary" onclick="App.analyze()">Analyze my CV</button>' +
      '<button class="btn btn-outline" onclick="App.loadSample()">Load sample CV</button>' +
      (state.cvText ? '<button class="btn btn-danger" onclick="App.clearCv()">Clear</button>' : '') +
      '</div></div></div></section>';
  }

  function profileRow(label, value, fromCv) {
    const v = Array.isArray(value) ? value.join(', ') : value;
    return '<div class="list-row"><span class="muted">' + label + '</span><span>' +
      (v ? esc(v) + (fromCv ? '<span class="prov prov-cv">CV</span>' : '') : '—') + '</span></div>';
  }

  function prefsCard() {
    const p = state.profile;
    const chips = CITIES.map((c) => {
      const on = (p.preferredCities || []).indexOf(c) !== -1;
      return '<label class="check-chip"><input type="checkbox" data-city="' + esc(c) + '"' + (on ? ' checked' : '') + '> ' + esc(c) + '</label>';
    }).join('');
    return '<div class="card"><h3>Your preferences</h3>' +
      '<p class="muted" style="font-size:.88rem">These personalize the Location and Salary scores — without them every job scores a neutral 80 on both.</p>' +
      '<div class="field"><label>Preferred cities</label><div class="checks" id="prefCities">' + chips + '</div></div>' +
      '<div class="field"><label>Expected salary (SAR / month)</label>' +
      '<input class="input" type="number" min="0" id="prefSalary" placeholder="e.g. 14000" value="' + esc(p.preferredSalary || '') + '"></div>' +
      (cloudEnabled()
        ? '<div class="field"><label>Email alerts</label>' +
          '<label class="check-chip"><input type="checkbox" id="prefAlerts"' + (state.alertOptIn ? ' checked' : '') + '> Email me new matches weekly</label></div>'
        : '') +
      '<button class="btn btn-primary btn-sm" onclick="App.savePrefs()">Save preferences</button></div>';
  }

  /* ---------- activity & learning insights ---------- */
  function insightsCard() {
    const ev = state.events || [];
    const now = Date.now(), d30 = 30 * 24 * 3600 * 1000;
    const recent = ev.filter((e) => now - e.t < d30);
    const cnt = (arr, types) => arr.filter((e) => types.indexOf(e.type) !== -1).length;
    const views = cnt(recent, ['view']);
    const saves = cnt(recent, ['save', 'interested']);
    const applies = cnt(recent, ['apply']);

    const byProf = {}, byCity = {};
    ev.forEach((e) => {
      const w = EVENT_W[e.type] !== undefined ? EVENT_W[e.type] : 1;
      if (e.prof) byProf[e.prof] = (byProf[e.prof] || 0) + w;
      if (e.city) byCity[e.city] = (byCity[e.city] || 0) + w;
    });
    const topProf = Object.keys(byProf).sort((a, b) => byProf[b] - byProf[a])[0];
    const topCity = Object.keys(byCity).sort((a, b) => byCity[b] - byCity[a])[0];

    let h = '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">📈 Activity &amp; learning</h3>' +
      (ev.length ? '<button class="btn btn-ghost btn-sm" onclick="App.clearActivity()">Clear activity</button>' : '') + '</div>';
    if (!ev.length) {
      h += '<p class="muted">No activity yet. Viewing, saving and applying to jobs teaches the matcher what you want — ' +
        'those jobs earn a small score boost (up to +8) over time. Everything stays inside your account.</p></div>';
      return h;
    }
    h += '<div class="list-row"><span class="muted">Last 30 days</span><span><b>' + views + '</b> views · <b>' + saves + '</b> saves · <b>' + applies + '</b> applies</span></div>' +
      '<div class="list-row"><span class="muted">Total events</span><span>' + ev.length + '</span></div>' +
      (topProf ? '<div class="list-row"><span class="muted">Most engaged profession</span><span>' + esc(topProf) + ' <span class="prov prov-user">+' + Math.min(6, byProf[topProf]) + ' boost</span></span></div>' : '') +
      (topCity ? '<div class="list-row"><span class="muted">Most engaged city</span><span>' + esc(topCity) + ' <span class="prov prov-user">+' + Math.min(4, byCity[topCity]) + ' boost</span></span></div>' : '') +
      '<p class="muted mt" style="font-size:.82rem">How it learns: each view is worth 1 point, a save 2, an apply 3. ' +
      'Points in a profession add up to +6 and in a city up to +4 to matching scores (max +8 total). ' +
      'Clearing activity removes the boost immediately. Stored only in your account.</p></div>';
    return h;
  }

  /* ---------- privacy & data card ---------- */
  function privacyCard() {
    return '<div class="card mt-lg"><h3>🔐 Privacy &amp; your data</h3>' +
      '<div class="list-row"><span class="muted">Storage</span><span>' +
      (currentUser && currentUser.cloud
        ? 'Your account (Supabase, row-level security) + a cache in this browser'
        : 'This browser only') + '</span></div>' +
      '<div class="list-row"><span class="muted">Email alerts</span><span>' + (state.alertOptIn ? 'On — weekly digest' : 'Off') + '</span></div>' +
      '<div class="list-row"><span class="muted">Shared with employers</span><span>Never — you apply on the employer\'s own site</span></div>' +
      '<div class="flex mt wrap">' +
      '<a class="btn btn-outline btn-sm" href="privacy.html" target="_blank" rel="noopener">Read the Privacy Policy</a>' +
      '<button class="btn btn-danger btn-sm" onclick="App.deleteAccount()">Delete my data &amp; sign out</button></div>' +
      '<p class="muted mt" style="font-size:.78rem;margin:8px 0 0">Deletion erases your CV, profile, saved jobs, preferences and activity — immediately, from both the cloud and this device.</p></div>';
  }

  function dashboardView() {
    const p = state.profile;
    const displayName = p.fullName || (currentUser && currentUser.name) || '';
    const comp = Engine.completeness(p);
    const strength = Engine.profileStrength(p);
    const good = scoredJobs().filter((x) => x.res.final >= 70).length;
    const savedIds = Object.keys(state.saved).filter((id) => state.saved[id]);
    const tips = state.cvText ? Engine.improvementTips(p, state.cvText) : [];
    const cvRoute = state.cvText ? 'analysis' : 'upload';

    let h = '<section class="section"><div class="container">' +
      '<div class="dash-head"><div><h2 style="margin:0">Dashboard</h2>' +
      '<p class="muted" style="margin:4px 0 0">' + (displayName ? 'Welcome, ' + esc(displayName) : 'Your matching overview') +
      (currentUser ? ' · signed in as ' + esc(currentUser.email) + (currentUser.cloud ? ' · ☁ synced' : '') : '') + '</p></div>' +
      '<div class="flex wrap">' +
      (state.cvText ? '<button class="btn btn-primary" onclick="App.go(\'analysis\')">CV Analysis report</button>' : '') +
      '<button class="btn btn-outline" onclick="App.go(\'upload\')">' + (state.cvText ? 'Re-analyze CV' : 'Upload CV') + '</button></div></div>' +
      '<div class="grid grid-4">' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'' + cvRoute + '\')" title="Open CV analysis"><div class="ic" style="background:#e6f7f4">📊</div><div><b>' + comp + '%</b><br><span class="muted">Profile completeness</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'' + cvRoute + '\')" title="Open CV analysis"><div class="ic" style="background:#e8effe">💪</div><div><b>' + strength + '%</b><br><span class="muted">Profile strength</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'jobs\')" title="See matching jobs"><div class="ic" style="background:#e8f8ee">🎯</div><div><b>' + good + '</b><br><span class="muted">Matches ≥ 70</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.goAnchor(\'dashboard\',\'savedJobs\')" title="Jump to saved jobs"><div class="ic" style="background:#f1eafe">🔖</div><div><b>' + savedIds.length + '</b><br><span class="muted">Saved jobs</span></div></div></div>' +
      '<div class="grid grid-2 mt-lg">' +
      '<div class="card"><h3>Your profile</h3>' +
      profileRow('Name', p.fullName, !!p.fullName) +
      profileRow('Email', p.email, !!p.email) +
      profileRow('Phone', p.phone, !!p.phone) +
      profileRow('Profession', p.profession, !!p.profession) +
      profileRow('Specialty', p.specialty, !!p.specialty) +
      profileRow('Experience', p.years != null ? p.years + ' years' : '', p.years != null) +
      profileRow('Location', p.location || p.currentCountry, !!(p.location || p.currentCountry)) +
      profileRow('SCFHS classification', p.scfhsClassification, !!p.scfhsClassification) +
      profileRow('SCFHS registration', p.scfhsRegistration, !!p.scfhsRegistration) +
      profileRow('DataFlow', p.dataflow, !!p.dataflow) +
      profileRow('Skills', p.skills, p.skills.length > 0) +
      profileRow('Certifications', p.certs, p.certs.length > 0) +
      '<div class="mt"><div class="flex between"><span class="muted">Completeness</span><b>' + comp + '%</b></div>' +
      '<div class="progress"><div style="width:' + comp + '%"></div></div></div></div>' +
      '<div>' + prefsCard() + '</div>' +
      '</div>' +
      '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">Improve your CV</h3>' +
      (state.cvText ? '<button class="btn btn-ghost btn-sm" onclick="App.go(\'analysis\')">Full ATS report →</button>' : '') + '</div>';

    if (!state.cvText) {
      h += emptyState('No CV analyzed yet', 'Upload or paste your CV to get personalized improvement tips.');
    } else if (!tips.length) {
      h += '<p class="muted">No tips available.</p>';
    } else {
      const mark = { high: ['mk-bad', '✕'], medium: ['mk-warn', '!'], low: ['mk-info', 'i'], ok: ['mk-ok', '✓'] };
      h += '<ul class="analysis-list">' + tips.map((t) => {
        const m = mark[t.sev] || mark.low;
        return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(t.title) + '</b><br><span class="muted">' + esc(t.detail) + '</span></span></li>';
      }).join('') + '</ul>';
    }
    h += '</div>';

    h += insightsCard();

    /* saved jobs */
    h += '<div class="card mt-lg" id="savedJobs"><h3>Saved jobs</h3>';
    if (!savedIds.length) {
      h += '<p class="muted">Nothing saved yet — open the <a href="#" onclick="App.go(\'jobs\');return false;">Jobs</a> page and save a match.</p>';
    } else {
      h += '<div class="table-wrap"><table><thead><tr><th>Job</th><th>Match</th><th>Status</th><th></th></tr></thead><tbody>';
      savedIds.forEach((id) => {
        const item = scoredJobs().find((x) => x.job.id === id);
        if (!item) return;
        const st = state.saved[id];
        h += '<tr><td><b>' + esc(item.job.title) + '</b><br><span class="muted">' + esc(item.job.employer) + ' · ' + esc(item.job.city) + '</span></td>' +
          '<td>' + matchBadge(item.res.final) + '</td>' +
          '<td><span class="status-pill st-' + st + '">' + cap(st) + '</span></td>' +
          '<td class="flex wrap">' +
          '<button class="btn btn-primary btn-sm" onclick="App.openJob(\'' + id + '\')">View</button>' +
          '<select class="input" style="width:auto;padding:6px 10px" onchange="App.setStatus(\'' + id + '\', this.value)">' +
          ['saved', 'interested', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'].map((o) =>
            '<option value="' + o + '"' + (o === st ? ' selected' : '') + '>' + cap(o) + '</option>').join('') +
          '</select></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    /* sources */
    h += '<div class="card mt-lg"><h3>Job sources</h3><div class="table-wrap"><table><thead><tr><th>Source</th><th>Type</th><th>Last sync</th><th>Imported</th><th>Status</th></tr></thead><tbody>' +
      JOB_SOURCES.map((s) =>
        '<tr><td><b>' + esc(s.name) + '</b><br><span class="muted" style="font-size:.78rem">' + esc(s.url) + '</span></td>' +
        '<td>' + esc(s.type) + '</td><td>' + esc(s.lastSync) + '</td><td>' + s.imported + '</td>' +
        '<td><span class="badge ' + (s.active ? 'badge-green' : 'badge-gray') + '">' + (s.active ? 'Active' : 'Paused') + '</span></td></tr>').join('') +
      '</tbody></table></div><p class="muted mt" style="font-size:.8rem">Live sources sync automatically every Monday via GitHub Actions.</p></div>';

    h += privacyCard();

    h += '</div></section>';
    return h;
  }

  /* ---------- modal ---------- */
  function openJobModal(id) {
    if (!currentUser) { authView('signup'); return; }
    const item = scoredJobs().find((x) => x.job.id === id);
    if (!item) return;
    const job = item.job, res = item.res;
    trackEvent('view', job);
    const pair = Engine.matchLabel(res.final);
    const color = pair[1];
    const realApply = isRealUrl(job.applyUrl);
    const applyLabel = realApply
      ? (job.applyIsDirect ? 'Apply on employer site ↗' : 'Apply on ' + hostOf(job.applyUrl) + ' ↗')
      : 'Apply (demo)';
    const applyNote = realApply
      ? (job.applyIsDirect
          ? '<p class="mt muted" style="font-size:.8rem">Opens the employer\'s own application page in a new tab.</p>'
          : '<p class="mt muted" style="font-size:.8rem">This posting is hosted by ' + esc(hostOf(job.applyUrl)) + ' — the employer\'s application form is usually one click from there.</p>')
      : (job.demo ? '<p class="mt"><span class="demo-strip">⚠ Synthetic demo job — application is simulated</span></p>' : '');
    const rows = [['Profession', 'profession'], ['Qualifications', 'qualifications'], ['Experience', 'experience'],
      ['Saudi licensing', 'licensing'], ['Skills', 'skills'], ['Location', 'location'], ['Salary', 'salary']];
    const hasSem = res.semantic !== null && res.semantic !== undefined;

    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal modal-lg">' +
      '<div class="flex between"><div><h3 style="margin:0">' + esc(job.title) + '</h3>' +
      '<div class="job-emp">' + esc(job.employer) + ' · ' + esc(job.city) + ' · ' + esc(job.employment) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<div class="flex mt wrap">' + ring(res.final, color) + matchBadge(res.final) +
      salaryBadge(job) +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + ' yrs exp</span>' +
      '<span class="badge badge-gray">SCFHS: ' + esc(pretty(job.scfhs)) + '</span>' +
      '<span class="badge badge-gray">DataFlow: ' + esc(pretty(job.dataflow)) + '</span></div>' +
      (hasSem
        ? '<p class="mt" style="margin-bottom:0"><span class="badge badge-violet">AI</span> <span class="muted" style="font-size:.84rem">Final score blends 65% rule engine (' +
          res.score + ') + 35% AI semantic similarity (' + res.semantic + ').</span></p>'
        : '') +
      '<p class="mt">' + esc(job.description) + '</p>' +
      '<h4>Score breakdown</h4>' +
      rows.map((r) => bdRow(r[0], Math.round(res.breakdown[r[1]] || 0))).join('') +
      (hasSem ? bdRow('AI similarity', res.semantic) : '') +
      (res.boost ? boostRow(res.boost) : '') +
      (res.caps.length ? '<p class="mt"><span class="badge badge-red">Score capped</span> <span class="muted">' + res.caps.map(esc).join(' · ') + '</span></p>' : '') +
      '<div class="grid grid-2 mt"><div><h4>Analysis vs your profile</h4>' + analysisList(res) + '</div>' +
      '<div><h4>Requirements</h4><ul class="analysis-list">' +
      (job.requirements.length ? job.requirements.map((r) => '<li><span class="mk mk-info">•</span><span>' + esc(r) + '</span></li>').join('') : '<li class="muted">Not listed in the posting.</li>') +
      '</ul><h4 class="mt">Responsibilities</h4><ul class="analysis-list">' +
      (job.responsibilities.length ? job.responsibilities.map((r) => '<li><span class="mk mk-info">•</span><span>' + esc(r) + '</span></li>').join('') : '<li class="muted">Not listed in the posting.</li>') +
      '</ul></div></div>' +
      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.applyJob(\'' + job.id + '\')">' + esc(applyLabel) + '</button>' +
      '<button class="btn btn-outline" onclick="App.coverLetter(\'' + job.id + '\')">✉ Cover letter</button>' +
      '<button class="btn btn-outline" onclick="App.interviewPrep(\'' + job.id + '\')">🎤 Interview prep</button>' +
      '<button class="btn btn-outline" onclick="App.setStatus(\'' + job.id + '\',\'interested\');App.closeModal()">Mark interested</button>' +
      '</div>' +
      applyNote +
      '</div></div>';
  }

  /* ---------- master render ---------- */
  function render() {
    const views = { home: homeView, jobs: jobsView, upload: uploadView, analysis: analysisView, dashboard: dashboardView };
    const main = (GATED[state.route] && !currentUser) ? lockedView(state.route) : (views[state.route] || homeView)();
    $('#app').innerHTML = navView() + main + footerView();
    bindDropzone();
  }

  function bindDropzone() {
    const dz = $('#dz');
    if (!dz) return;
    const fileInput = $('#cvFile');
    dz.addEventListener('click', () => fileInput && fileInput.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) readCvFile(e.dataTransfer.files[0]);
    });
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) readCvFile(fileInput.files[0]);
      });
    }
  }

  function readCvFile(file) {
    if (/\.pdf$/i.test(file.name)) {
      readPdfFile(file);
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast('Supported files: PDF or .txt — or paste the text into the box.', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const ta = $('#cvText');
      if (ta) ta.value = String(reader.result || '');
      toast('CV file loaded — now click "Analyze my CV".', 'ok');
    };
    reader.onerror = () => toast('Could not read that file. Paste the text instead.', 'err');
    reader.readAsText(file);
  }

  function readPdfFile(file) {
    if (typeof pdfjsLib === 'undefined') {
      toast('PDF support needs an internet connection the first time (the PDF library loads from a CDN). Paste the text instead.', 'err');
      return;
    }
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } catch (e) { /* older builds */ }
    toast('Reading PDF…', 'info');
    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result);
      pdfjsLib.getDocument({ data: data }).promise.then((pdf) => {
        const pages = [];
        const getPage = (i) => {
          if (i > pdf.numPages) return Promise.resolve();
          return pdf.getPage(i).then((p) => p.getTextContent()).then((tc) => {
            pages.push(tc.items.map((it) => it.str).join(' '));
            return getPage(i + 1);
          });
        };
        return getPage(1).then(() => {
          const text = pages.join('\n').replace(/[ \t]+/g, ' ').trim();
          const ta = $('#cvText');
          if (!text) {
            toast('This PDF looks like a scanned image — it has no text layer. Open it, copy what you can, or re-export it as a text PDF.', 'err');
            return;
          }
          if (ta) ta.value = text;
          toast('PDF loaded (' + pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : '') + ') — now click "Analyze my CV".', 'ok');
        });
      }).catch(() => toast('Could not read that PDF (it may be corrupted or password-protected). Paste the text instead.', 'err'));
    };
    reader.onerror = () => toast('Could not read that file. Paste the text instead.', 'err');
    reader.readAsArrayBuffer(file);
  }

  function flattenExtraction(ext) {
    const p = Object.assign(emptyProfile(), ext || {});
    if (ext && ext.licensing) Object.assign(p, ext.licensing);
    delete p.licensing;
    delete p.prov;
    return p;
  }

  /* ---------- public API ---------- */
  window.App = {
    go(route) {
      state.route = route;
      save();
      render();
      gcPage(route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    goAnchor(route, anchorId) {
      state.route = route;
      save();
      render();
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    toggleMenu() {
      const n = $('#navLinks');
      if (n) n.classList.toggle('open');
    },
    closeMenus() {
      const np = $('#notifPanel'); if (np) np.classList.add('hidden');
      const am = $('#acctMenu'); if (am) am.classList.add('hidden');
    },
    toggleBell(e) {
      e.stopPropagation();
      const am = $('#acctMenu'); if (am) am.classList.add('hidden');
      const panel = $('#notifPanel');
      if (panel) panel.classList.toggle('hidden');
    },
    toggleAccountMenu(e) {
      e.stopPropagation();
      const np = $('#notifPanel'); if (np) np.classList.add('hidden');
      const m = $('#acctMenu');
      if (m) m.classList.toggle('hidden');
    },
    markNotifsRead(e) {
      if (e) e.stopPropagation();
      topMatches(3).forEach(({ job }) => {
        if (state.notifsReadIds.indexOf(job.id) === -1) state.notifsReadIds.push(job.id);
      });
      save();
      render();
      const panel = $('#notifPanel');
      if (panel) panel.classList.remove('hidden');
    },
    openNotif(id) {
      if (state.notifsReadIds.indexOf(id) === -1) state.notifsReadIds.push(id);
      save();
      App.closeMenus();
      openJobModal(id);
    },
    openAuth(mode) { authView(mode); },
    submitAuth(mode) {
      const nameEl = $('#authName');
      const emailEl = $('#authEmail');
      const errEl = $('#authErr');
      const name = nameEl ? nameEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
      const fail = (msg) => {
        if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
      };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Enter a valid email address.');

      /* cloud mode: magic link for both sign-in and sign-up */
      if (cloudEnabled()) {
        if (mode === 'signup' && name.length < 2) return fail('Enter your name.');
        if (!sb) return fail('Sign-in service is still loading — try again in a few seconds.');
        sendMagicLink(email, mode === 'signup' ? name : '', $('.modal .btn-primary'));
        return;
      }

      /* local mode */
      const accs = loadJSON(ACC_KEY) || {};
      if (mode === 'signup') {
        if (name.length < 2) return fail('Enter your name.');
        if (accs[email]) return fail('An account with this email already exists — sign in instead.');
        accs[email] = { name: name, createdAt: new Date().toISOString() };
        saveJSON(ACC_KEY, accs);
        currentUser = { email: email, name: name };
        saveJSON(SES_KEY, { email: email });
        wipeState();
        save();
        App.closeModal();
        App.go('dashboard');
        toast('Welcome, ' + name + '! Your account is ready — upload your CV to begin.', 'ok');
      } else {
        if (!accs[email]) return fail('No account found with this email — sign up first.');
        currentUser = { email: email, name: accs[email].name };
        saveJSON(SES_KEY, { email: email });
        wipeState();
        const data = loadJSON(accountKey(email));
        if (data) applyData(data);
        save();
        App.closeModal();
        App.go('dashboard');
        toast('Welcome back, ' + accs[email].name + '!', 'ok');
      }
    },
    signOut() {
      const wasCloud = currentUser && currentUser.cloud;
      currentUser = null;
      handledUid = null;
      try { localStorage.removeItem(SES_KEY); } catch (e) { /* ignore */ }
      if (wasCloud && sb) { sb.auth.signOut().catch(() => {}); }
      wipeState();
      App.closeMenus();
      App.closeModal();
      App.go('home');
      toast('Signed out — your data stays safe in your account.', 'info');
    },
    async deleteAccount() {
      if (!currentUser) return;
      if (!confirm('Delete ALL your MedMatch data — CV, profile, saved jobs, preferences, activity — and sign out?\n\nThis cannot be undone.')) return;
      const email = currentUser.email;
      const wasCloud = !!currentUser.cloud;
      try {
        if (wasCloud && sb) {
          const { data } = await sb.auth.getUser();
          if (data && data.user) {
            await sb.from('user_data').delete().eq('id', data.user.id);
          }
        }
      } catch (e) { console.warn('cloud delete:', e); /* still wipe locally */ }
      try { localStorage.removeItem(accountKey(email)); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(SES_KEY); } catch (e) { /* ignore */ }
      currentUser = null;
      handledUid = null;
      if (wasCloud && sb) { sb.auth.signOut().catch(() => {}); }
      wipeState();
      App.closeMenus();
      App.closeModal();
      App.go('home');
      toast('Your data has been deleted — cloud and this device.', 'ok');
    },
    setFilter(key, value) {
      state.filters[key] = value;
      save();
      render();
    },
    resetFilters() {
      state.filters = { profession: '', city: '', employment: '', minSalary: '', nl: '' };
      save();
      render();
    },
    aiSearch() {
      const inp = $('#nlInput');
      state.filters.nl = inp ? inp.value.trim() : '';
      if (state.filters.nl) {
        gcEvent('search', 'search: ' + state.filters.nl);
        if (currentUser) {
          const nl = Engine.parseNLQuery(state.filters.nl);
          if (nl.profession || nl.city) {
            pushEvent({ t: Date.now(), type: 'search', id: '', prof: nl.profession || '', city: nl.city || '' });
          }
        }
      }
      save();
      render();
      if (state.filters.nl) toast('AI search applied: "' + state.filters.nl + '"', 'info');
    },
    clearNl() {
      state.filters.nl = '';
      save();
      render();
    },
    openJob: openJobModal,
    coverLetter: coverLetterView,
    interviewPrep: interviewPrepView,
    copyLetter() {
      const ta = $('#letterText');
      if (!ta) return;
      const done = () => toast('Letter copied — paste it into the application form.', 'ok');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
      } else {
        ta.select();
        document.execCommand('copy');
        done();
      }
    },
    copyPrep() {
      if (!lastPrepText) return;
      const done = () => toast('Prep sheet copied — print or save it anywhere.', 'ok');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastPrepText).then(done, () => {
          const ta = document.createElement('textarea');
          ta.value = lastPrepText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          done();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = lastPrepText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
      }
    },
    savePrefs() {
      const box = $('#prefCities');
      const cities = [];
      if (box) {
        box.querySelectorAll('input[data-city]').forEach((cb) => {
          if (cb.checked) cities.push(cb.getAttribute('data-city'));
        });
      }
      const sal = ($('#prefSalary') || {}).value || '';
      state.profile.preferredCities = cities;
      state.profile.preferredSalary = sal.trim();
      const al = $('#prefAlerts');
      if (al) state.alertOptIn = al.checked;
      save();
      render();
      toast('Preferences saved.', 'ok');
    },
    clearActivity() {
      state.events = [];
      save();
      render();
      toast('Activity history cleared — learned boosts removed.', 'info');
    },
    closeModal() { $('#modal-root').innerHTML = ''; },
    setStatus(id, status) {
      if (!currentUser) { App.openAuth('signin'); return; }
      const job = DEMO_JOBS.find((x) => x.id === id);
      if (status) {
        state.saved[id] = status;
        if (job) trackEvent(status === 'saved' ? 'save' : status, job);
      } else {
        delete state.saved[id];
      }
      save();
      render();
      if (status) toast('Job marked as "' + cap(status) + '".', 'ok');
    },
    applyJob(id) {
      if (!currentUser) { App.openAuth('signin'); return; }
      const item = DEMO_JOBS.find((x) => x.id === id);
      const url = item && item.applyUrl;
      if (item) trackEvent('apply', item);
      state.saved[id] = 'applied';
      save();
      App.closeModal();
      render();
      if (isRealUrl(url)) {
        window.open(url, '_blank', 'noopener');
        toast('Opening the posting in a new tab — job marked as applied.', 'ok');
      } else {
        toast('Application recorded (demo). Good luck! 🎉', 'ok');
      }
    },
    loadSample() {
      const ta = $('#cvText');
      if (ta) ta.value = SAMPLE_CV_TEXT;
      toast('Sample CV loaded — click "Analyze my CV".', 'info');
    },
    clearCv() {
      state.cvText = '';
      state.profile = emptyProfile();
      embState.cvVec = null;
      embState.ready = false;
      save();
      render();
      toast('CV and profile cleared.', 'info');
    },
    analyze() {
      if (!currentUser) { App.openAuth('signin'); return; }
      const ta = $('#cvText');
      const text = ta ? ta.value.trim() : '';
      if (!text) {
        toast('Paste your CV text first (or drop in a PDF).', 'err');
        return;
      }
      try {
        const ext = Engine.extractFromText(text);
        const prevCities = state.profile.preferredCities;
        const prevSalary = state.profile.preferredSalary;
        state.profile = flattenExtraction(ext);
        if (prevCities && prevCities.length) state.profile.preferredCities = prevCities;
        if (prevSalary) state.profile.preferredSalary = prevSalary;
        state.cvText = text;
        embState.cvVec = null;
        embState.ready = false;
        save();
        toast('CV analyzed — see your full ATS report on the CV Analysis page.', 'ok');
        App.go('analysis');
        warmupSemantic(false);
      } catch (err) {
        toast('Extraction failed: ' + err.message, 'err');
      }
    }
  };

  /* close modal on Escape + close menus on outside click */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') App.closeModal();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) App.closeMenus();
  });

  render();
  initCloud();

  /* returning signed-in user with a CV: warm up AI similarity silently */
  try { if (state.cvText) warmupSemantic(true); } catch (e) { /* never block the UI */ }
})();
