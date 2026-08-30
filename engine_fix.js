/* ============================================================
   MedMatch — engine_fix.js v3 (loads AFTER engine.js, BEFORE app.js)
   Scoring hardening against bad source data:

   1) TITLE OVERRIDES TAG. If the posting's title normalizes to a
      known profession that disagrees with the tag, the title wins.
   2) JUNK CAP. Recognizably non-clinical titles (sales, veterinary,
      hospitality, academia, trades…) are capped at 10.
   3) DISTRUST DEFAULT TAGS. If a title neither normalizes nor
      contains a clinical keyword, the collector's tag is treated as
      unreliable and the posting is scored as "Other".
   4) THIN-POSTING CAP. An empty posting (no skills, no requirements,
      no real description, no salary, no city) earns 100s by default
      on every category — absence is not evidence. Scores are capped
      by how much verifiable information the posting carries:
      0–1 signals → cap 55,  2 signals → cap 72.
      Employer-direct postings get +1 signal (a verified source).

   No API changes. Also loaded by send_alerts.js, so emails and the
   site score identically.
   ============================================================ */
(function () {
  if (typeof Engine === 'undefined') return;

  const orig = Engine.scoreJob;

  const JUNK = /telephon|call\s*cent|concierge|swiss service|waiter|waitress|\bchef\b|\bcook\b|driver|chauffeur|cashier|housekeep|security guard|barista|valet|bell\s?(hop|boy)|storekeep|warehouse|cleaner|janitor|gardener|electrician|plumber|territory|\bsales\b|account (manager|executive)|business development|livestock|veterinar|postdoctoral|research fellow|مبيعات|تسويق|سائق|نادل|طباخ|كاشير|عامل نظافة|حارس|لحام|كهربائي|سباك/i;

  const CLINICAL = /doctor|physician|طبيب|ممارس|مقيم|resident|house officer|استشاري|consultant|specialist|أخصائي|nurs|تمريض|ممرض|pharmac|صيدل|dent|أسنان|physio|علاج طبيعي|radiolog|أشعة|laborator|مختبر|technician|technologist|فني|midwi|قابل|anesth|تخدير|paramedic|إسعاف|optometr|nutrition|تغذية|psycholog|therap|علاج|speech|occupational|medical|طبي|clinic|عيادة|hospital|مستشفى|surgeon|جراح|cardio|pediatric|أطفال|oncolog|dermat|ophthalm|عيون|orthoped|عظام|gynec|نساء|urolog|nephro|gastro|neurol|أعصاب|psychiat|\bicu\b|intensive care|عناية|emergency|طوارئ|vaccin|تطعيم|public health|صحة عامة|infection control|مكافحة/i;

  function infoSignals(job) {
    let n = 0;
    if (job.skills && job.skills.length) n++;
    if (job.requirements && job.requirements.length) n++;
    if ((job.description || '').length > 100) n++;
    if (job.salaryMin || job.salaryMax) n++;
    if (job.city && job.city !== 'Other') n++;
    if (job.applyIsDirect) n++; // employer-direct = verified source
    return n;
  }

  Engine.scoreJob = function (profile, job) {
    const title = job.title || '';
    let res;

    if (JUNK.test(title)) {
      /* layer 2 */
      res = orig(profile, Object.assign({}, job, { profession: '__nonclinical__' }));
      res.score = Math.min(res.score, 10);
      if (res.caps.indexOf('Non-clinical posting') === -1) res.caps.push('Non-clinical posting');
      return res;
    }

    const tp = Engine.normalizeTitle ? Engine.normalizeTitle(title) : null;
    if (tp && tp !== job.profession) {
      /* layer 1 */
      res = orig(profile, Object.assign({}, job, { profession: tp }));
      res.notes = (res.notes || []).concat([
        'Re-classified from its title: ' + tp +
        (job.profession ? ' (posting was tagged "' + job.profession + '")' : '') + '.'
      ]);
    } else if (!tp && !CLINICAL.test(title)) {
      /* layer 3 */
      res = orig(profile, Object.assign({}, job, { profession: 'Other' }));
      res.notes = (res.notes || []).concat([
        'Posting category could not be verified from its title — scored as "Other".'
      ]);
    } else {
      res = orig(profile, job);
    }

    /* layer 4: thin postings cannot score high on absence of data */
    const info = infoSignals(job);
    if (info <= 1 && res.score > 55) {
      res.score = 55;
      res.caps.push('Unverifiable posting — almost no detail provided');
    } else if (info === 2 && res.score > 72) {
      res.score = 72;
      res.caps.push('Thin posting — little detail to verify fit');
    }
    return res;
  };
})();
