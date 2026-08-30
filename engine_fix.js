/* ============================================================
   MedMatch — engine_fix.js v2 (loads AFTER engine.js, BEFORE app.js)
   Scoring hardening against bad source data:

   1) TITLE OVERRIDES TAG. If the posting's title normalizes to a
      known profession that disagrees with the tag, the title wins.
   2) JUNK CAP. Recognizably non-clinical titles (sales, veterinary,
      hospitality, academia, trades…) are capped at 10 whatever the
      tags claim.
   3) DISTRUST DEFAULT TAGS. The collector tags anything it can't
      classify as "General Practitioner". If a title neither
      normalizes nor contains any clinical keyword, the tag is
      treated as unreliable and the posting is scored as "Other".

   No API changes: Engine.scoreJob keeps the same signature and
   return shape. Also loaded by send_alerts.js so emails and the
   site score identically.
   ============================================================ */
(function () {
  if (typeof Engine === 'undefined') return;

  const orig = Engine.scoreJob;

  const JUNK = /telephon|call\s*cent|concierge|swiss service|waiter|waitress|\bchef\b|\bcook\b|driver|chauffeur|cashier|housekeep|security guard|barista|valet|bell\s?(hop|boy)|storekeep|warehouse|cleaner|janitor|gardener|electrician|plumber|territory|\bsales\b|account (manager|executive)|business development|livestock|veterinar|postdoctoral|research fellow|مبيعات|تسويق|سائق|نادل|طباخ|كاشير|عامل نظافة|حارس|لحام|كهربائي|سباك/i;

  const CLINICAL = /doctor|physician|طبيب|ممارس|مقيم|resident|house officer|استشاري|consultant|specialist|أخصائي|nurs|تمريض|ممرض|pharmac|صيدل|dent|أسنان|physio|علاج طبيعي|radiolog|أشعة|laborator|مختبر|technician|technologist|فني|midwi|قابل|anesth|تخدير|paramedic|إسعاف|optometr|nutrition|تغذية|psycholog|therap|علاج|speech|occupational|medical|طبي|clinic|عيادة|hospital|مستشفى|surgeon|جراح|cardio|pediatric|أطفال|oncolog|dermat|ophthalm|عيون|orthoped|عظام|gynec|نساء|urolog|nephro|gastro|neurol|أعصاب|psychiat|\bicu\b|intensive care|عناية|emergency|طوارئ|vaccin|تطعيم|public health|صحة عامة|infection control|مكافحة/i;

  Engine.scoreJob = function (profile, job) {
    const title = job.title || '';

    /* layer 2: junk titles are capped, whatever the tags claim */
    if (JUNK.test(title)) {
      const res = orig(profile, Object.assign({}, job, { profession: '__nonclinical__' }));
      res.score = Math.min(res.score, 10);
      if (res.caps.indexOf('Non-clinical posting') === -1) res.caps.push('Non-clinical posting');
      return res;
    }

    /* layer 1: a recognized title corrects a wrong profession tag */
    const tp = Engine.normalizeTitle ? Engine.normalizeTitle(title) : null;
    if (tp && tp !== job.profession) {
      const res = orig(profile, Object.assign({}, job, { profession: tp }));
      res.notes = (res.notes || []).concat([
        'Re-classified from its title: ' + tp +
        (job.profession ? ' (posting was tagged "' + job.profession + '")' : '') + '.'
      ]);
      return res;
    }

    /* layer 3: unrecognized title → don't trust a default-looking tag */
    if (!tp && !CLINICAL.test(title)) {
      const res = orig(profile, Object.assign({}, job, { profession: 'Other' }));
      res.notes = (res.notes || []).concat([
        'Posting category could not be verified from its title — scored as "Other".'
      ]);
      return res;
    }

    return orig(profile, job);
  };
})();
