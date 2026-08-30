/* ============================================================
   MedMatch — engine_fix.js (loads AFTER engine.js, BEFORE app.js)
   Scoring hardening against bad source data:

   1) TITLE OVERRIDES TAG. Aggregator data sometimes carries a wrong
      profession field. If the posting's title normalizes to a known
      profession that disagrees with the tag, the title wins and the
      analysis notes the correction.

   2) JUNK CAP. Recognizably non-clinical titles (telephone operator,
      driver, chef, …) are capped at 10 no matter what the tags say —
      a mis-tagged hotel job can never again outscore a physician.

   No API changes: Engine.scoreJob keeps the same signature and
   return shape; app.js and send_alerts.js need no edits.
   ============================================================ */
(function () {
  if (typeof Engine === 'undefined') return;

  const orig = Engine.scoreJob;

  const JUNK = /telephon|call\s*cent|concierge|swiss service|waiter|waitress|\bchef\b|\bcook\b|driver|chauffeur|cashier|housekeep|security guard|barista|valet|bell\s?(hop|boy)|storekeep|warehouse|cleaner|janitor|gardener|electrician|plumber|سائق|نادل|طباخ|كاشير|عامل نظافة|حارس|لحام|كهربائي|سباك/i;

  Engine.scoreJob = function (profile, job) {
    /* layer 2: junk titles are capped, whatever the tags claim */
    if (JUNK.test(job.title || '')) {
      const res = orig(profile, Object.assign({}, job, { profession: '__nonclinical__' }));
      res.score = Math.min(res.score, 10);
      if (res.caps.indexOf('Non-clinical posting') === -1) res.caps.push('Non-clinical posting');
      return res;
    }

    /* layer 1: a recognized title corrects a wrong profession tag */
    const tp = Engine.normalizeTitle ? Engine.normalizeTitle(job.title) : null;
    if (tp && tp !== job.profession) {
      const res = orig(profile, Object.assign({}, job, { profession: tp }));
      res.notes = (res.notes || []).concat([
        'Re-classified from its title: ' + tp +
        (job.profession ? ' (posting was tagged "' + job.profession + '")' : '') + '.'
      ]);
      return res;
    }

    return orig(profile, job);
  };
})();
