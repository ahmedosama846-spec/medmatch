/* ============================================================
   MedMatch — app.js (UI layer, v21)
   Renders the whole app into #app.
   Depends on globals from data.js  (DEMO_JOBS, CITIES, PROFESSIONS,
   EMPLOYMENT_TYPES, JOB_SOURCES, SAMPLE_CV_TEXT, SKILLS_VOCAB) and
   on the Engine API from engine.js + engine_fix.js hardening.

   v21: ARABIC / RTL. 🌐 toggle in the nav switches the whole UI
   between English and Arabic (dir=rtl). ~150 chrome strings
   translated; professions/cities/employment/statuses display in
   Arabic while stored values stay English (filters/scoring safe).
   Job content and engine-generated analysis stay in source language.
   v20: privacy — privacy.html + delete-my-data.
   v19: email alerts opt-in.
   v18: cloud accounts — Supabase magic links + cross-device sync.
   v17: guest teaser.  v16: feedback loop.  v15: auth gate.
   v11: semantic matching (65% rules + 35% AI similarity).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Supabase + analytics config ---------- */
  const SUPABASE_URL = 'https://qglgpckjspltwetctzgv.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_TJIQpJIhPxkKDmH8YgIoVw_zuCNxzel';
  const GOATCOUNTER_CODE = '';

  /* ============================================================
     i18n — English / Arabic
     ============================================================ */
  const I18N = {
    en: {
      navHome: 'Home', navJobs: 'Jobs', navUpload: 'Upload CV', navAnalysis: 'CV Analysis', navDash: 'Dashboard',
      signIn: 'Sign in', signUp: 'Sign up', signOut: 'Sign out',
      notifications: 'Notifications', markAllRead: 'Mark all read',
      notifGuest1: '🔒 <b>Sign in</b> to get match alerts personalized to your CV.',
      notifGuest2: 'Create a free account →',
      notifEmpty: 'No matches yet — analyze your CV to see personalized matches.',
      notifTip: '💡 Tip: run the CV Analysis page to raise your match scores.',
      eyebrow: '⚡ AI-matched healthcare jobs',
      heroH1a: 'Find the healthcare job that matches', heroH1b: 'your', heroH1c: 'CV',
      heroLead: 'Create a free account, upload your CV, and let the matching engine score live healthcare jobs — currently covering Saudi Arabia — against your qualifications, experience, licensing status and career goals.',
      createFree: 'Create free account', browseJobs: 'Browse jobs', uploadCv: 'Upload your CV',
      statJobs: 'Live jobs', statSources: 'Sources', statCities: 'Cities', statProf: 'Professions',
      profStrength: 'Your profile strength',
      heroCardGuest: 'Sign in and upload your CV — your profile strength and personal match scores appear here.',
      heroCardNoCv: 'Signed in. Upload or paste your CV to get personalized match scores.',
      heroCardCv: 'Profile built from your CV. Visit the dashboard to see how to improve it.',
      goDash: 'Go to dashboard',
      howTitle: 'How it works',
      step1t: 'Create an account & upload your CV',
      step1x: 'Sign in with a magic email link — no password. The engine extracts your profession, experience, skills and licensing status, and everything syncs across your devices.',
      step2t: 'Get scored matches',
      step2x: 'Every job is scored 0–100 across profession, qualifications, experience, licensing, skills, location and salary — plus AI semantic similarity when available.',
      step3t: 'Apply with confidence',
      step3x: 'See exactly what matches, what is missing, and how to strengthen your CV for employers.',
      jobsTitle: 'Matched jobs',
      jobsCount: '{a} of {b} jobs · sorted by match score',
      jobsAiOn: 'AI similarity on',
      guestCount: 'Showing {a} of {b} jobs — create a free account to unlock employer names, salaries, match scores and apply links',
      nlLabel: '🤖 Ask in plain English',
      nlPh: 'e.g. "GP jobs in Riyadh above 12000 suitable for my CV"',
      search: 'Search', clear: 'Clear',
      fProfession: 'Profession', fCity: 'City', fEmployment: 'Employment', fSalary: 'Min salary (SAR)', fReset: 'Reset filters', fAll: 'All',
      viewAnalysis: 'View analysis', save: 'Save', unsave: 'Unsave',
      guestBtn: '🔒 Sign in to view details & apply',
      guestLock: '🔒 Match',
      teaserH: '{n} more jobs locked',
      teaserX: 'Create a free account to see every posting with employer names, salary ranges, your personal match scores, full analysis and direct apply links. Sign in once — on any device — and everything follows you.',
      createAccount: 'Create account',
      noJobs: 'No jobs match these filters', noJobsSub: 'Try removing a filter or broadening your search.',
      authCreate: 'Create your account', authBack: 'Welcome back',
      authName: 'Your name', authEmail: 'Email',
      magicBtn: '📬 Email me a sign-in link',
      magicFoot: 'No password needed — we email you a magic link. Your CV, saved jobs and preferences sync securely across your devices (row-level security; only you can read your data). Includes a weekly job-match email — turn it off anytime in Dashboard → Preferences.',
      agree: 'By continuing you agree to our',
      privacyLink: 'Privacy Policy',
      checkEmail: 'Check your email',
      checkEmailX: 'We sent a sign-in link to {email}. Click it and you\'ll land back here, signed in — on any device.',
      close: 'Close',
      lockedH: '{page} requires an account',
      lockedX: 'Your CV and personal data live only inside your account — never visible to guests or to anyone else using this device. Sign in on any device and everything follows you.',
      lockedNote: 'Magic-link sign-in — no passwords, nothing to remember.',
      upTitle: 'Upload your CV',
      upIntro: 'Drop in your PDF CV, upload a .txt file, or paste the text below. Your CV is analyzed in your browser and stored in your account — it syncs to your other devices, and only you can read it.',
      upDrop: 'Drop your CV here (PDF or .txt) — or click to browse',
      upHint: 'PDFs are read in your browser via pdf.js (needs internet once, to load the library). Scanned PDFs that are just photos have no text layer — copy-paste those. Word files: open, copy, paste.',
      upCvText: 'CV text', upPaste: 'Paste your full CV text here…',
      analyzeBtn: 'Analyze my CV', sampleBtn: 'Load sample CV', clearBtn: 'Clear',
      step1: 'Paste or upload CV', step2: 'AI extraction', step3: 'Matched jobs',
      dashTitle: 'Dashboard', welcome: 'Welcome, {name}', dashOverview: 'Your matching overview',
      signedInAs: 'signed in as', synced: '☁ synced',
      atsReport: 'CV Analysis report', reanalyze: 'Re-analyze CV',
      mComplete: 'Profile completeness', mStrength: 'Profile strength', mMatches: 'Matches ≥ 70', mSaved: 'Saved jobs',
      yourProfile: 'Your profile', yourPrefs: 'Your preferences',
      prefsX: 'These personalize the Location and Salary scores — without them every job scores a neutral 80 on both.',
      prefCities: 'Preferred cities', prefSalary: 'Expected salary (SAR / month)', prefAlerts: 'Email alerts',
      prefAlertsOn: 'Email me new matches weekly', savePrefs: 'Save preferences',
      pName: 'Name', pEmail: 'Email', pPhone: 'Phone', pProfession: 'Profession', pSpecialty: 'Specialty',
      pExperience: 'Experience', pLocation: 'Location', pScfhsC: 'SCFHS classification', pScfhsR: 'SCFHS registration',
      pDataflow: 'DataFlow', pSkills: 'Skills', pCerts: 'Certifications', pCompleteness: 'Completeness',
      years: 'years',
      improveTitle: 'Improve your CV', fullAts: 'Full ATS report →',
      noCv: 'No CV analyzed yet', noCvSub: 'Upload or paste your CV to get personalized improvement tips.',
      actTitle: '📈 Activity & learning', clearActivity: 'Clear activity',
      actEmpty: 'No activity yet. Viewing, saving and applying to jobs teaches the matcher what you want — those jobs earn a small score boost (up to +8) over time. Everything stays inside your account.',
      act30: 'Last 30 days', actTotal: 'Total events', actProf: 'Most engaged profession', actCity: 'Most engaged city',
      actViews: 'views', actSaves: 'saves', actApplies: 'applies', boost: 'boost',
      actHow: 'How it learns: each view is worth 1 point, a save 2, an apply 3. Points in a profession add up to +6 and in a city up to +4 to matching scores (max +8 total). Clearing activity removes the boost immediately. Stored only in your account.',
      savedTitle: 'Saved jobs', savedEmpty: 'Nothing saved yet — open the Jobs page and save a match.',
      thJob: 'Job', thMatch: 'Match', thStatus: 'Status', view: 'View',
      sourcesTitle: 'Job sources', thSource: 'Source', thType: 'Type', thSync: 'Last sync', thImported: 'Imported', thStatus2: 'Status',
      sourcesNote: 'Live sources sync automatically every Monday via GitHub Actions.',
      active: 'Active', paused: 'Paused',
      privTitle: '🔐 Privacy & your data',
      privStorage: 'Storage', privStorageCloud: 'Your account (Supabase, row-level security) + a cache in this browser',
      privAlerts: 'Email alerts', privAlertsOn: 'On — weekly digest', privAlertsOff: 'Off',
      privShared: 'Shared with employers', privSharedNo: 'Never — you apply on the employer\'s own site',
      privRead: 'Read the Privacy Policy', privDelete: 'Delete my data & sign out',
      privNote: 'Deletion erases your CV, profile, saved jobs, preferences and activity — immediately, from both the cloud and this device.',
      anTitle: 'CV Analysis', anSub: 'ATS compatibility report · {n} words analyzed', updateCv: 'Update CV',
      anNoCv: 'No CV to analyze', anNoCvSub: 'Upload or paste your CV first — the ATS report is generated from your CV text, right in your browser.',
      atsScore: 'ATS score', catBreakdown: 'Category breakdown', strongPts: '💪 Strong points',
      weakPts: '⚠ Weak points & recommended fixes', weakNone: 'No weak points detected — excellent.',
      strongNone: 'No strong points detected yet — work through the fixes below.',
      checklist: '📋 Employer checklist',
      checklistX: 'Beyond ATS formatting, employers in the current coverage area screen for these specifically:',
      howScore: 'How the score works',
      howScoreX: 'The report runs entirely in your browser. It checks what applicant tracking systems parse (contact block, standard headings, dates, keywords, bullets) and what healthcare recruiters screen for (licensing, verification, certifications, quantified clinical experience). Fix the high-severity items first — each one visibly raises your match scores on the Jobs page.',
      modBreakdown: 'Score breakdown', modVsProfile: 'Analysis vs your profile', modReq: 'Requirements', modResp: 'Responsibilities',
      modNotListed: 'Not listed in the posting.',
      yrsExp: 'yrs exp', scfhsL: 'SCFHS', dataflowL: 'DataFlow',
      aiBlend: 'Final score blends 65% rule engine ({a}) + 35% AI semantic similarity ({b}).',
      learnedRow: 'Learned from your activity',
      scoreCapped: 'Score capped',
      applyBtn: 'Apply on employer site ↗', applyHost: 'Apply on {host} ↗',
      applyDemo: 'Apply (demo)',
      noteDirect: 'Opens the employer\'s own application page in a new tab.',
      noteHosted: 'This posting is hosted by {host} — the employer\'s application form is usually one click from there.',
      coverLetter: '✉ Cover letter', interviewPrep: '🎤 Interview prep', markInterested: 'Mark interested',
      salaryNotStated: 'Salary not stated',
      demoStrip: '⚠ Synthetic demo job — application is simulated',
      ftCopy: 'Copy letter', ftBack: '← Back to analysis', copyPrep: 'Copy prep sheet',
      footAbout: 'AI-matched healthcare jobs. Currently covering Saudi Arabia — more countries planned. Jobs are aggregated from live sources; always verify details with the employer.',
      footProduct: 'Product', footLicensing: 'Licensing', footLegal: 'Legal', footData: 'Data',
      footJobs: 'jobs loaded', footRights: '© 2026 MedMatch. Job listings belong to their original sources.',
      profMap: {}, cityMap: {}, empMap: {}, statusMap: {}, matchMap: {}
    },

    ar: {
      navHome: 'الرئيسية', navJobs: 'الوظائف', navUpload: 'رفع السيرة', navAnalysis: 'تحليل السيرة', navDash: 'لوحة التحكم',
      signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', signOut: 'تسجيل الخروج',
      notifications: 'الإشعارات', markAllRead: 'تعيين الكل كمقروء',
      notifGuest1: '🔒 <b>سجّل الدخول</b> لتصلك تنبيهات مطابقة مبنية على سيرتك الذاتية.',
      notifGuest2: 'أنشئ حساباً مجانياً ←',
      notifEmpty: 'لا توجد مطابقات بعد — حلّل سيرتك الذاتية لرؤية مطابقات مخصصة.',
      notifTip: '💡 نصيحة: شغّل صفحة تحليل السيرة لرفع درجات مطابقتك.',
      eyebrow: '⚡ وظائف صحية بالمطابقة الذكية',
      heroH1a: 'اعثر على الوظيفة الصحية التي تناسب', heroH1b: 'سيرتك', heroH1c: 'الذاتية',
      heroLead: 'أنشئ حساباً مجانياً وارفع سيرتك الذاتية، ودع محرك المطابقة يقيّم الوظائف الصحية المباشرة — حالياً في السعودية — مقابل مؤهلاتك وخبرتك وحالة ترخيصك وأهدافك المهنية.',
      createFree: 'أنشئ حساباً مجانياً', browseJobs: 'تصفح الوظائف', uploadCv: 'ارفع سيرتك الذاتية',
      statJobs: 'وظيفة مباشرة', statSources: 'مصدر', statCities: 'مدينة', statProf: 'مهنة',
      profStrength: 'قوة ملفك',
      heroCardGuest: 'سجّل الدخول وارفع سيرتك الذاتية — تظهر هنا قوة ملفك ودرجات مطابقتك الشخصية.',
      heroCardNoCv: 'تم تسجيل الدخول. ارفع أو الصق سيرتك الذاتية للحصول على درجات مخصصة.',
      heroCardCv: 'تم بناء ملفك من سيرتك الذاتية. زر لوحة التحكم لترى كيف تحسّنها.',
      goDash: 'إلى لوحة التحكم',
      howTitle: 'كيف يعمل',
      step1t: 'أنشئ حساباً وارفع سيرتك',
      step1x: 'سجّل الدخول برابط بريدي سحري — بلا كلمة مرور. يستخرج المحرك مهنتك وخبرتك ومهاراتك وحالة ترخيصك، وتتزامن بياناتك عبر أجهزتك.',
      step2t: 'احصل على مطابقات مُقيّمة',
      step2x: 'تُقيَّم كل وظيفة من 0 إلى 100 عبر المهنة والمؤهلات والخبرة والترخيص والمهارات والموقع والراتب — إضافة إلى التشابه الدلالي بالذكاء الاصطناعي عند توفره.',
      step3t: 'قدّم بثقة',
      step3x: 'اعرف بالضبط ما يطابق وما ينقص، وكيف تقوّي سيرتك الذاتية لأصحاب العمل.',
      jobsTitle: 'الوظائف المطابقة',
      jobsCount: '{a} من أصل {b} وظيفة · مرتبة حسب درجة المطابقة',
      jobsAiOn: 'التشابه الذكي مفعّل',
      guestCount: 'نعرض {a} من أصل {b} وظيفة — أنشئ حساباً مجانياً لكشف أسماء أصحاب العمل والرواتب ودرجات المطابقة وروابط التقديم',
      nlLabel: '🤖 اسأل بالإنجليزية',
      nlPh: 'مثال: "GP jobs in Riyadh above 12000 suitable for my CV"',
      search: 'بحث', clear: 'مسح',
      fProfession: 'المهنة', fCity: 'المدينة', fEmployment: 'نوع الدوام', fSalary: 'أقل راتب (ريال)', fReset: 'إعادة التعيين', fAll: 'الكل',
      viewAnalysis: 'عرض التحليل', save: 'حفظ', unsave: 'إلغاء الحفظ',
      guestBtn: '🔒 سجّل الدخول لعرض التفاصيل والتقديم',
      guestLock: '🔒 المطابقة',
      teaserH: '{n} وظيفة أخرى مقفلة',
      teaserX: 'أنشئ حساباً مجانياً لرؤية كل الوظائف بأسماء أصحاب العمل ونطاقات الرواتب ودرجات مطابقتك الشخصية والتحليل الكامل وروابط التقديم المباشرة. سجّل مرة واحدة — من أي جهاز — وتتبعك بياناتك.',
      createAccount: 'إنشاء حساب',
      noJobs: 'لا توجد وظائف تطابق هذه الفلاتر', noJobsSub: 'جرّب إزالة فلتر أو توسيع بحثك.',
      authCreate: 'أنشئ حسابك', authBack: 'أهلاً بعودتك',
      authName: 'الاسم', authEmail: 'البريد الإلكتروني',
      magicBtn: '📬 أرسل لي رابط الدخول',
      magicFoot: 'لا حاجة لكلمة مرور — نرسل لك رابطاً سحرياً بالبريد. تتزامن سيرتك ووظائفك المحفوظة وتفضيلاتك بأمان عبر أجهزتك (أمان على مستوى الصف؛ لا أحد سواك يقرأ بياناتك). تشمل رسالة أسبوعية بالمطابقات — أوقفها متى شئت من لوحة التحكم ← التفضيلات.',
      agree: 'بالمتابعة أنت توافق على',
      privacyLink: 'سياسة الخصوصية',
      checkEmail: 'تحقق من بريدك',
      checkEmailX: 'أرسلنا رابط دخول إلى {email}. اضغطه وستعود هنا مسجّلاً — من أي جهاز.',
      close: 'إغلاق',
      lockedH: '{page} تتطلب حساباً',
      lockedX: 'سيرتك الذاتية وبياناتك الشخصية تعيش فقط داخل حسابك — لا تظهر أبداً للزوار أو لأي شخص آخر يستخدم هذا الجهاز. سجّل الدخول من أي جهاز ويتبعك كل شيء.',
      lockedNote: 'دخول برابط سحري — بلا كلمات مرور، لا شيء لتتذكره.',
      upTitle: 'رفع سيرتك الذاتية',
      upIntro: 'أسقط ملف PDF أو ارفع ملف ‎.txt أو الصق النص أدناه. تُحلَّل سيرتك في متصفحك وتُخزَّن في حسابك — تتزامن مع أجهزتك الأخرى، ولا يقرأها أحد سواك.',
      upDrop: 'أسقط سيرتك هنا (PDF أو ‎.txt) — أو اضغط للاختيار',
      upHint: 'تُقرأ ملفات PDF في متصفحك عبر pdf.js (يحتاج إنترنت مرة واحدة لتحميل المكتبة). ملفات PDF المصوّرة (صور ممسوحة) لا تحمل نصاً — انسخها والصقها. ملفات Word: افتحها وانسخ والصق.',
      upCvText: 'نص السيرة الذاتية', upPaste: 'الصق نص سيرتك الذاتية كاملاً هنا…',
      analyzeBtn: 'حلّل سيرتي', sampleBtn: 'تحميل نموذج', clearBtn: 'مسح',
      step1: 'الصق أو ارفع السيرة', step2: 'الاستخراج الذكي', step3: 'الوظائف المطابقة',
      dashTitle: 'لوحة التحكم', welcome: 'مرحباً، {name}', dashOverview: 'نظرة عامة على مطابقتك',
      signedInAs: 'مسجّل كـ', synced: '☁ متزامن',
      atsReport: 'تقرير تحليل السيرة', reanalyze: 'إعادة تحليل السيرة',
      mComplete: 'اكتمال الملف', mStrength: 'قوة الملف', mMatches: 'مطابقات ≥ 70', mSaved: 'وظائف محفوظة',
      yourProfile: 'ملفك', yourPrefs: 'تفضيلاتك',
      prefsX: 'هذه التفضيلات تخصّص درجتي الموقع والراتب — بدونها تحصل كل وظيفة على 80 محايدة في كليهما.',
      prefCities: 'المدن المفضلة', prefSalary: 'الراتب المتوقع (ريال / شهر)', prefAlerts: 'التنبيهات البريدية',
      prefAlertsOn: 'أرسل لي المطابقات الجديدة أسبوعياً', savePrefs: 'حفظ التفضيلات',
      pName: 'الاسم', pEmail: 'البريد', pPhone: 'الجوال', pProfession: 'المهنة', pSpecialty: 'التخصص',
      pExperience: 'الخبرة', pLocation: 'الموقع', pScfhsC: 'تصنيف SCFHS', pScfhsR: 'تسجيل SCFHS',
      pDataflow: 'داتافلو', pSkills: 'المهارات', pCerts: 'الشهادات', pCompleteness: 'الاكتمال',
      years: 'سنوات',
      improveTitle: 'حسّن سيرتك الذاتية', fullAts: 'تقرير ATS الكامل ←',
      noCv: 'لم تُحلَّل أي سيرة بعد', noCvSub: 'ارفع أو الصق سيرتك الذاتية للحصول على نصائح مخصصة.',
      actTitle: '📈 النشاط والتعلّم', clearActivity: 'مسح النشاط',
      actEmpty: 'لا يوجد نشاط بعد. مشاهدة الوظائف وحفظها والتقديم عليها يعلّم المحرك ما تريده — تكسب تلك الوظائف دفعة صغيرة في الدرجة (حتى +8) مع الوقت. كل شيء يبقى داخل حسابك.',
      act30: 'آخر 30 يوماً', actTotal: 'إجمالي الأحداث', actProf: 'المهنة الأكثر تفاعلاً', actCity: 'المدينة الأكثر تفاعلاً',
      actViews: 'مشاهدة', actSaves: 'حفظ', actApplies: 'تقديم', boost: 'دفعة',
      actHow: 'كيف يتعلم: كل مشاهدة بنقطة، والحفظ بنقطتين، والتقديم بثلاث. تتراكم النقاط في المهنة حتى +6 وفي المدينة حتى +4 على درجات المطابقة (بحد أقصى +8). مسح النشاط يزيل الدفعة فوراً. محفوظ فقط في حسابك.',
      savedTitle: 'الوظائف المحفوظة', savedEmpty: 'لا شيء محفوظ بعد — افتح صفحة الوظائف واحفظ مطابقة.',
      thJob: 'الوظيفة', thMatch: 'المطابقة', thStatus: 'الحالة', view: 'عرض',
      sourcesTitle: 'مصادر الوظائف', thSource: 'المصدر', thType: 'النوع', thSync: 'آخر تحديث', thImported: 'المستورَد', thStatus2: 'الحالة',
      sourcesNote: 'تتزامن المصادر المباشرة تلقائياً كل اثنين عبر GitHub Actions.',
      active: 'نشط', paused: 'متوقف',
      privTitle: '🔐 الخصوصية وبياناتك',
      privStorage: 'التخزين', privStorageCloud: 'حسابك (Supabase، أمان على مستوى الصف) + نسخة مؤقتة في هذا المتصفح',
      privAlerts: 'التنبيهات البريدية', privAlertsOn: 'مفعّلة — ملخص أسبوعي', privAlertsOff: 'متوقفة',
      privShared: 'تُشارك مع أصحاب العمل', privSharedNo: 'أبداً — تقدّم على موقع صاحب العمل نفسه',
      privRead: 'اقرأ سياسة الخصوصية', privDelete: 'احذف بياناتي وسجّل الخروج',
      privNote: 'الحذف يمحو سيرتك وملفك ووظائفك المحفوظة وتفضيلاتك ونشاطك — فوراً، من السحابة ومن هذا الجهاز.',
      anTitle: 'تحليل السيرة الذاتية', anSub: 'تقرير توافق ATS · تم تحليل {n} كلمة', updateCv: 'تحديث السيرة',
      anNoCv: 'لا توجد سيرة لتحليلها', anNoCvSub: 'ارفع أو الصق سيرتك أولاً — يُولَّد تقرير ATS من نص سيرتك، داخل متصفحك مباشرة.',
      atsScore: 'درجة ATS', catBreakdown: 'تفصيل الفئات', strongPts: '💪 نقاط القوة',
      weakPts: '⚠ نقاط الضعف والإصلاحات المقترحة', weakNone: 'لم تُرصد نقاط ضعف — ممتاز.',
      strongNone: 'لم تُرصد نقاط قوة بعد — اعمل على الإصلاحات أدناه.',
      checklist: '📋 قائمة أصحاب العمل',
      checklistX: 'إضافة إلى تنسيق ATS، يفحص أصحاب العمل في منطقة التغطية الحالية هذه النقاط تحديداً:',
      howScore: 'كيف تعمل الدرجة',
      howScoreX: 'يعمل التقرير بالكامل داخل متصفحك. يفحص ما تقرؤه أنظمة تتبع المتقدمين (بيانات التواصل، العناوين القياسية، التواريخ، الكلمات المفتاحية، النقاط) وما يبحث عنه مسؤولو التوظيف الصحي (الترخيص، التحقق، الشهادات، الخبرة المُقاسة). أصلح البنود عالية الخطورة أولاً — كل واحد منها يرفع درجات مطابقتك في صفحة الوظائف بشكل واضح.',
      modBreakdown: 'تفصيل الدرجة', modVsProfile: 'التحليل مقابل ملفك', modReq: 'المتطلبات', modResp: 'المهام',
      modNotListed: 'غير مذكورة في الإعلان.',
      yrsExp: 'سنوات خبرة', scfhsL: 'SCFHS', dataflowL: 'داتافلو',
      aiBlend: 'الدرجة النهائية تمزج 65% محرك القواعد ({a}) + 35% التشابه الدلالي الذكي ({b}).',
      learnedRow: 'مستفاد من نشاطك',
      scoreCapped: 'الدرجة مقيّدة',
      applyBtn: 'التقديم على موقع صاحب العمل ↗', applyHost: 'التقديم على {host} ↗',
      applyDemo: 'تقديم (تجريبي)',
      noteDirect: 'يفتح صفحة التقديم الرسمية لصاحب العمل في تبويب جديد.',
      noteHosted: 'هذا الإعلان مستضاف على {host} — نموذج التقديم لصاحب العمل عادة على بعد نقرة واحدة من هناك.',
      coverLetter: '✉ خطاب التقديم', interviewPrep: '🎤 تحضير المقابلة', markInterested: 'وضع "مهتم"',
      salaryNotStated: 'الراتب غير مذكور',
      demoStrip: '⚠ وظيفة تجريبية مصطنعة — التقديم محاكى',
      ftCopy: 'نسخ الخطاب', ftBack: '← عودة للتحليل', copyPrep: 'نسخ ورقة التحضير',
      footAbout: 'وظائف صحية بالمطابقة الذكية. التغطية حالياً السعودية — ودول أخرى لاحقاً. الوظائف مجمّعة من مصادر مباشرة؛ تحقق دائماً من التفاصيل مع صاحب العمل.',
      footProduct: 'المنتج', footLicensing: 'الترخيص', footLegal: 'قانوني', footData: 'البيانات',
      footJobs: 'وظيفة محمّلة', footRights: '© 2026 ميدماتش. إعلانات الوظائف ملك لمصادرها الأصلية.',
      profMap: {
        'General Practitioner': 'طبيب عام', 'Specialist': 'أخصائي', 'Consultant': 'استشاري',
        'Dentist': 'طبيب أسنان', 'Nurse': 'تمريض', 'Pharmacist': 'صيدلي',
        'Physiotherapist': 'علاج طبيعي', 'Radiologist': 'أشعة', 'Laboratory': 'مختبرات',
        'Healthcare Administrator': 'إدارة صحية', 'Other': 'أخرى'
      },
      cityMap: {
        'Riyadh': 'الرياض', 'Jeddah': 'جدة', 'Dammam': 'الدمام', 'Khobar': 'الخبر',
        'Mecca': 'مكة', 'Medina': 'المدينة', 'Abha': 'أبها', 'Tabuk': 'تبوك',
        'Al Ahsa': 'الأحساء', 'Qassim': 'القصيم', 'Other': 'أخرى'
      },
      empMap: { 'Full-time': 'دوام كامل', 'Part-time': 'دوام جزئي', 'Contract': 'عقد', 'Temporary': 'مؤقت' },
      statusMap: {
        saved: 'محفوظ', interested: 'مهتم', applied: 'تم التقديم', interview: 'مقابلة',
        offer: 'عرض', rejected: 'مرفوض', withdrawn: 'منسحب'
      },
      matchMap: {
        'Excellent match': 'مطابقة ممتازة', 'Strong match': 'مطابقة قوية', 'Good match': 'مطابقة جيدة',
        'Partial match': 'مطابقة جزئية', 'Low match': 'مطابقة منخفضة'
      }
    }
  };

  let lang = 'en';
  try { lang = localStorage.getItem('medmatch_lang') === 'ar' ? 'ar' : 'en'; } catch (e) { /* ignore */ }

  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const tr = (k, vars) => {
    let s = t(k);
    if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  const T_PROF = (p) => t('profMap')[p] || p;
  const T_CITY = (c) => t('cityMap')[c] || c;
  const T_EMP = (e) => t('empMap')[e] || e;
  const T_STATUS = (s) => t('statusMap')[s] || s;
  const T_MATCH = (m) => t('matchMap')[m] || m;

  const RTL_CSS =
    'body{direction:rtl;text-align:right}' +
    'input,textarea,select{text-align:right}' +
    '.toasts{left:20px;right:auto}' +
    'th,td{text-align:right}' +
    '.badge,.status-pill,.ring-label,.prov,.stat b,.step-num{direction:ltr;unicode-bidi:isolate}' +
    '.bd-row b{direction:ltr;unicode-bidi:isolate}' +
    '.job-actions,.flex{direction:rtl}' +
    'code{direction:ltr;unicode-bidi:isolate}';

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    let st = document.getElementById('rtlStyle');
    if (lang === 'ar' && !st) {
      st = document.createElement('style');
      st.id = 'rtlStyle';
      st.textContent = RTL_CSS;
      document.head.appendChild(st);
    } else if (lang !== 'ar' && st) {
      st.remove();
    }
  }

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

  /* ---------- GoatCounter (optional, anonymous) ---------- */
  function gcReady() { return !!(GOATCOUNTER_CODE && window.goatcounter && window.goatcounter.count); }
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
     Accounts: cloud (Supabase magic links) + local cache.
     ============================================================ */
  const ACC_KEY = 'medmatch_accounts';
  const SES_KEY = 'medmatch_session';
  const GUEST_KEY = 'medmatch_saudi_v1';

  function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  let currentUser = null;

  function accountKey(email) { return 'medmatch_data_' + email; }
  function cloudEnabled() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY); }

  function persistState() {
    if (!currentUser) return;
    saveJSON(accountKey(currentUser.email), {
      profile: state.profile, cvText: state.cvText, saved: state.saved,
      filters: state.filters, notifsReadIds: state.notifsReadIds,
      events: state.events, alertOptIn: state.alertOptIn,
      atsHistory: state.atsHistory || []
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
    state.atsHistory = data.atsHistory || [];
    state.alertOptIn = data.alertOptIn !== false;
  }

  function wipeState() {
    state.profile = emptyProfile();
    state.cvText = '';
    state.saved = {};
    state.notifsReadIds = [];
    state.events = [];
    state.atsHistory = [];
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
      events: state.events, alertOptIn: state.alertOptIn,
      atsHistory: state.atsHistory || []
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
    pushTimer = setTimeout(pushCloud, 1200);
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
        const local = loadJSON(accountKey(email));
        if (local) { applyData(local); pushCloud(); }
      }
    } catch (e) {
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
        '<h3>' + t('checkEmail') + '</h3>' +
        '<p class="muted">' + tr('checkEmailX', { email: '<b>' + esc(email) + '</b>' }) + '</p>' +
        '<button class="btn btn-outline" onclick="App.closeModal()">' + t('close') + '</button></div></div></div>';
    } catch (e) {
      const errEl = $('#authErr');
      if (errEl) { errEl.textContent = e.message || 'Could not send the link — try again.'; errEl.classList.remove('hidden'); }
      if (btn) { btn.disabled = false; btn.textContent = t('magicBtn'); }
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
    events: [],
    atsHistory: [],
    alertOptIn: true
  };

  (function boot() {
    try { localStorage.removeItem(GUEST_KEY); } catch (e) { /* ignore */ }
    if (cloudEnabled()) return;
    const ses = loadJSON(SES_KEY);
    const accs = loadJSON(ACC_KEY) || {};
    if (ses && ses.email && accs[ses.email]) {
      currentUser = { email: ses.email, name: accs[ses.email].name };
      applyData(loadJSON(accountKey(ses.email)));
    }
  })();

  function save() { persistState(); schedulePush(); }

  /* ---------- feedback loop ---------- */
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

  /* ---------- semantic layer ---------- */
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
    return '<span class="badge badge-' + pair[1] + '">' + esc(T_MATCH(pair[0])) + '</span>';
  }

  function salaryBadge(job) {
    if (!job.salaryMax && !job.salaryMin) {
      return '<span class="badge badge-gray">' + t('salaryNotStated') + '</span>';
    }
    return '<span class="badge badge-teal">SAR ' + fmt(job.salaryMin) + '–' + fmt(job.salaryMax) + '</span>';
  }

  function bdRow(label, val) {
    return '<div class="bd-row"><span>' + label + '</span>' +
      '<div class="progress"><div style="width:' + val + '%"></div></div><b>' + val + '</b></div>';
  }

  function boostRow(boost) {
    return '<div class="bd-row"><span>' + t('learnedRow') + '</span>' +
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

  function select(key, options, translate) {
    const cur = state.filters[key] || '';
    let h = '<select class="input" onchange="App.setFilter(\'' + key + '\', this.value)">';
    h += '<option value="">' + t('fAll') + '</option>';
    options.forEach((o) => {
      h += '<option value="' + esc(o) + '"' + (o === cur ? ' selected' : '') + '>' + esc(translate ? translate(o) : o) + '</option>';
    });
    return h + '</select>';
  }

  /* ---------- cover letter / interview prep (unchanged content) ---------- */
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
    paras.push('I am writing to apply for the position of ' + job.title + ' in ' + job.city +
      (job.source ? ', as advertised via ' + job.source.replace(/\s*\(Live\)/, '') : '') + '. As a ' +
      prof + focus + ' with ' + years + ', I am confident I can contribute effectively to your team.');
    const matches = (res.matches || []).slice(0, 4).map((m) => '- ' + m.replace(/\.$/, '') + '.');
    paras.push(matches.length
      ? 'My background aligns closely with your requirements:\n' + matches.join('\n')
      : 'My clinical experience in hospital and clinic settings aligns closely with the requirements of this role.');
    const lic = [];
    if (p.scfhsRegistration === 'Yes') lic.push('active SCFHS registration');
    else if (p.scfhsClassification === 'Yes') lic.push('SCFHS classification');
    if (p.dataflow === 'Completed') lic.push('completed DataFlow primary-source verification');
    else if (p.dataflow) lic.push('DataFlow verification (' + p.dataflow.toLowerCase() + ')');
    if ((p.certs || []).length) lic.push(p.certs.slice(0, 3).join(', ') + ' certification' + (p.certs.length > 1 ? 's' : ''));
    if (lic.length) paras.push('Regarding licensing, I hold ' + lic.join(', ') + ' — all documentation is ready for your verification process.');
    const skillsHave = (p.skills || []).map((s) => s.toLowerCase());
    const overlap = (job.skills || []).filter((s) => skillsHave.indexOf(s.toLowerCase()) !== -1).slice(0, 5);
    if (overlap.length) paras.push('Key skills I would bring to the role include ' + overlap.join(', ') + '.');
    paras.push('I would welcome the opportunity to discuss how my experience can benefit ' + job.employer +
      '. I am available for an interview at your convenience and can be reached at ' +
      (p.email || '[email]') + (p.phone ? ' or ' + p.phone : '') + '.');
    paras.push('Thank you for your time and consideration.');
    paras.push('Kind regards,\n' + name);
    const header = name + '\n' + contact + '\n' + date + '\n\n';
    const note = hasProfile ? '' : '*** NOTE: upload your CV on the Upload CV page first — this draft uses placeholders. ***\n\n';
    return note + header + paras.join('\n\n');
  }

  function coverLetterView(id) {
    const item = scoredJobs().find((x) => x.job.id === id);
    if (!item) return;
    const job = item.job;
    const letter = buildLetter(job, item.res, state.profile);
    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal modal-lg">' +
      '<div class="flex between"><div><h3 style="margin:0">' + t('coverLetter') + '</h3>' +
      '<div class="job-emp">' + esc(job.title) + ' · ' + esc(job.employer) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<p class="muted mt" style="font-size:.85rem">Drafted from your profile and this job\'s real match points. Review and personalize it before sending.</p>' +
      '<textarea class="input" id="letterText" style="min-height:340px;font-size:.9rem;line-height:1.6">' + esc(letter) + '</textarea>' +
      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.copyLetter()">' + t('ftCopy') + '</button>' +
      '<button class="btn btn-outline" onclick="App.openJob(\'' + job.id + '\')">' + t('ftBack') + '</button>' +
      '</div></div></div>';
  }

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
      '<div class="flex between"><div><h3 style="margin:0">' + t('interviewPrep') + '</h3>' +
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
          'show adjacent experience, and give a concrete plan or timeline to close the gap.</p>'
        : '') +
      '<h4 class="mt">🙋 Questions to ask them</h4>' +
      '<ul class="analysis-list">' + li(ASK_THEM, '→', 'mk-ok') + '</ul>' +
      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.copyPrep()">' + t('copyPrep') + '</button>' +
      '<button class="btn btn-outline" onclick="App.openJob(\'' + job.id + '\')">' + t('ftBack') + '</button>' +
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

  /* ---------- CV / ATS analyzer ---------- */
  const ACTION_VERBS = ['managed', 'led', 'provided', 'performed', 'delivered', 'implemented',
    'improved', 'reduced', 'achieved', 'supervised', 'coordinated', 'developed', 'established',
    'conducted', 'trained', 'assessed', 'diagnosed', 'treated', 'administered', 'monitored',
    'initiated', 'streamlined', 'mentored', 'reviewed', 'launched', 'authored', 'presented'];

  function analyzeCv(text, profile) {
    const tt = text || '';
    const lines = tt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const words = tt.split(/\s+/).filter(Boolean).length;
    const bullets = lines.filter((l) => /^[-•*▪◦]/.test(l)).length;
    const dateRanges = (tt.match(/(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current|now)/gi) || []).length;
    const quants = (tt.match(/\d+\s*(%|percent|patients?|cases|procedures|beds|visits|per day|\/day|\/week)/gi) || []).length;
    const verbsFound = ACTION_VERBS.filter((v) => new RegExp('\\b' + v, 'i').test(tt));
    const vocab = (typeof SKILLS_VOCAB !== 'undefined') ? SKILLS_VOCAB : [];
    const skillsFound = vocab.filter((s) => new RegExp('\\b' + escRe(s) + '\\b', 'i').test(tt));
    const sections = {
      'Summary / objective': /(professional\s+)?(summary|profile|objective)/i.test(tt),
      'Work experience': /((work|professional|clinical)\s+)?(experience|employment history)/i.test(tt),
      'Education': /education|academic qualific/i.test(tt),
      'Skills': /skills|competencies/i.test(tt),
      'Licensing / certifications': /licen[cs]|certification|credential/i.test(tt)
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
    if (words < 250) W('medium', 'CV is very short (' + words + ' words)', 'Aim for 1–2 pages: expand education, licensing, each role\'s responsibilities and skills.');
    if (words > 2000) W('low', 'CV is very long (' + words + ' words)', 'Trim to 2 pages. Keep the most recent 10–15 years of experience and cut repeated duties.');

    const bulletScore = bullets >= 5 ? 10 : (bullets >= 1 ? 5 : 0);
    cats.push({ label: 'Bullet-point formatting', score: bulletScore, max: 10 });
    if (bullets >= 5) strong.push('Responsibilities use bullet points (' + bullets + ' found) — easy for recruiters and parsers to scan.');
    if (bullets === 0) W('medium', 'No bullet points detected', 'Convert responsibility paragraphs into bullets starting with "- ". Bullets parse far better in ATS systems. Example: "- Managed 40+ OPD patients/day in a busy primary-care clinic."');

    const dateScore = dateRanges >= 2 ? 10 : (dateRanges === 1 ? 6 : 0);
    cats.push({ label: 'Dates on roles', score: dateScore, max: 10 });
    if (dateRanges >= 2) strong.push('Roles carry clear date ranges (' + dateRanges + ' found) — chronology is easy to verify.');
    if (dateRanges === 0) W('high', 'No date ranges detected', 'Add a date range to every role, e.g. "2021 - Present". ATS systems and employers both screen for verifiable chronology.');
    else if (dateRanges === 1) W('medium', 'Only one dated role found', 'Give every position a start and end date (MM/YYYY). Undated roles look like gaps.');

    const sk = skillsFound.length;
    const kwScore = sk >= 8 ? 15 : (sk >= 5 ? 11 : (sk >= 3 ? 7 : (sk >= 1 ? 3 : 0)));
    cats.push({ label: 'Clinical keywords (' + sk + ' found)', score: kwScore, max: 15 });
    if (sk >= 5) strong.push(sk + ' clinical keywords detected (' + skillsFound.slice(0, 4).join(', ') + '…) — good ATS keyword coverage.');
    if (sk < 3) {
      const miss = marketKeywords().filter((k) => !k.has).slice(0, 5).map((k) => k.s);
      W('high', 'Very few clinical keywords (' + sk + ')', 'Mirror the vocabulary of live postings: list concrete skills such as ' + (miss.length ? miss.join(', ') : 'OPD, triage, chronic disease management') + '.');
    }

    const qScore = quants >= 3 ? 10 : (quants >= 1 ? 6 : 0);
    cats.push({ label: 'Quantified achievements', score: qScore, max: 10 });
    if (quants >= 3) strong.push('Achievements are quantified (' + quants + ' numbers with units) — measurable results stand out.');
    if (quants === 0) W('medium', 'No quantified achievements', 'Add numbers: "managed 40+ OPD patients/day", "reduced waiting time by 20%". Numbers make experience credible.');

    const vScore = verbsFound.length >= 5 ? 10 : (verbsFound.length >= 3 ? 7 : (verbsFound.length >= 1 ? 4 : 0));
    cats.push({ label: 'Action verbs (' + verbsFound.length + ' found)', score: vScore, max: 10 });
    if (verbsFound.length >= 5) strong.push('Strong action verbs throughout (' + verbsFound.slice(0, 4).join(', ') + '…).');
    if (verbsFound.length <= 1) W('low', 'Few action verbs', 'Start each bullet with a verb: managed, provided, performed, implemented, supervised, reduced.');

    if (profile.scfhsRegistration === 'Yes') strong.push('Professional registration stated — the #1 filter employers apply.');
    else W('high', 'Professional registration status missing', 'State your licensing/registration status (e.g. SCFHS for Saudi Arabia, with number and expiry) in a dedicated Licensing section near the top.');
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
        emptyState(t('anNoCv'), t('anNoCvSub')) +
        '<div class="center"><button class="btn btn-primary" onclick="App.go(\'upload\')">' + t('uploadCv') + '</button></div>' +
        '</div></section>';
    }
    const a = analyzeCv(state.cvText, state.profile);
    const pair = atsLabel(a.score);
    const hist = state.atsHistory || [];
    const prevScore = hist.length > 1 ? hist[hist.length - 2].score : null;
    const delta = prevScore === null ? null : a.score - prevScore;
    const mark = { high: ['mk-bad', '✕'], medium: ['mk-warn', '!'], low: ['mk-info', 'i'], ok: ['mk-ok', '✓'] };
    const _sig = (s) => (s || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4).map((w) => w.slice(0, 7));
    const _weakWords = new Set();
    a.weak.forEach((w) => _sig(w.title).forEach((x) => _weakWords.add(x)));
    const saudiTips = Engine.improvementTips(state.profile, state.cvText)
      .filter((x) => !_sig(x.title).some((w) => _weakWords.has(w)));

    let h = '<section class="section"><div class="container">' +
      '<div class="dash-head"><div><h2 style="margin:0">' + t('anTitle') + '</h2>' +
      '<p class="muted" style="margin:4px 0 0">' + tr('anSub', { n: a.words }) + '</p></div>' +
      '<button class="btn btn-outline" onclick="App.go(\'upload\')">' + t('updateCv') + '</button></div>' +
      '<div class="grid grid-2">' +
      '<div class="card"><div class="flex between"><h3 style="margin:0">' + t('atsScore') + '</h3>' +
      '<div class="ring-wrap">' + ring(a.score, pair[1]) + '<span class="badge badge-' + pair[1] + '">' + pair[0] + '</span>' +
      (delta === null ? '' : '<span class="badge ' + (delta >= 0 ? 'badge-green' : 'badge-red') + '" title="vs your previous analysis">' + prevScore + ' &rarr; ' + a.score + ' (' + (delta >= 0 ? '+' : '') + delta + ')</span>') +
      '</div></div>' +
      '<div class="progress mt"><div style="width:' + a.score + '%"></div></div>' +
      '<h4 class="mt-lg">' + t('catBreakdown') + '</h4>' +
      a.cats.map(catRow).join('') + '</div>' +
      '<div class="card"><h3>' + t('strongPts') + '</h3>' +
      (a.strong.length
        ? '<ul class="analysis-list">' + a.strong.map((s) => '<li><span class="mk mk-ok">✓</span><span>' + esc(s) + '</span></li>').join('') + '</ul>'
        : '<p class="muted">' + t('strongNone') + '</p>') +
      '</div></div>' +
      cvReviewCard(a) +
      aiCard() +
      '<div class="card mt-lg"><h3>' + t('weakPts') + '</h3>' +
      (a.weak.length
        ? '<ul class="analysis-list">' + a.weak.map((w) => {
            const m = mark[w.sev] || mark.low;
            return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(w.title) + '</b> ' +
              '<span class="prov ' + (w.sev === 'high' ? 'prov-missing' : (w.sev === 'medium' ? 'prov-ai' : 'prov-user')) + '">' + w.sev + '</span>' +
              '<br><span class="muted">' + esc(w.detail) + '</span></span></li>';
          }).join('') + '</ul>'
        : '<p class="muted">' + t('weakNone') + '</p>') +
      '</div>' +
      quickFixesCard() +
      '<div class="card mt-lg"><h3>' + t('checklist') + '</h3>' +
      '<p class="muted">' + t('checklistX') + '</p>' +
      '<ul class="analysis-list">' + saudiTips.map((x) => {
        const m = mark[x.sev] || mark.low;
        return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(x.title) + '</b><br><span class="muted">' + esc(x.detail) + '</span></span></li>';
      }).join('') + '</ul></div>' +
      topMatchesCard() +
      marketCard() +
      '<div class="card mt-lg" style="background:#f0faf8;border-color:#c7e8e2"><h3>' + t('howScore') + '</h3>' +
      '<p class="muted" style="margin:0">' + t('howScoreX') + '</p></div>' +
      '</div></section>';
    return h;
  }


  /* ---------- CV review + AI (DeepSeek via Supabase Edge Function) (v28) ---------- */
  let cvEditMode = false, cvTpl = 'classic', cvMarks = true, cvView = 'auto', pdfStashText = '';
  let aiBusy = false, aiFixes = [];

  const CV_TPLS = { classic: 'Classic', modern: 'Modern', executive: 'Executive', compact: 'Compact', elegant: 'Elegant' };

  function cvFileKey() { return currentUser ? 'medmatchcvfile_' + currentUser.email : ''; }
  function cvFileGet() {
    const k = cvFileKey();
    const d = k ? loadJSON(k) : null;
    return d && d.data ? d : null;
  }
  function cvFileSet(name, data) {
    const k = cvFileKey();
    if (!k || !data) return;
    if (data.length > 3500000) { toast('Original PDF is large — keeping the text version only.', 'info'); return; }
    saveJSON(k, { name: name, data: data });
  }
  function cvFileClear() {
    pdfStashText = '';
    const k = cvFileKey();
    if (k) try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
  }

  async function callAi(mode, text, context) {
    if (!sb || !currentUser || !currentUser.cloud) return { error: 'AI features need a cloud sign-in (magic link).' };
    try {
      const r = await sb.functions.invoke('cv-ai', { body: { mode, text, context } });
      if (r.error) return { error: r.error.message || 'AI call failed' };
      return r.data || { error: 'Empty AI response' };
    } catch (e) { return { error: e.message || 'AI unavailable' }; }
  }

  function aiCard() {
    let inner;
    if (aiBusy) {
      inner = '<p class="muted">DeepSeek is reviewing your CV… this takes a few seconds.</p>';
    } else if (aiFixes.length) {
      inner = '<ul class="analysis-list">' + aiFixes.map((f, i) =>
        '<li><span class="mk mk-info">✨</span><span><b>' + esc(f.why || 'Suggested rewrite') + '</b>' +
        '<br><span class="muted" style="text-decoration:line-through">' + esc(f.find.slice(0, 140)) + (f.find.length > 140 ? '…' : '') + '</span>' +
        '<br><span>' + esc(f.replace.slice(0, 220)) + (f.replace.length > 220 ? '…' : '') + '</span>' +
        '<br><button class="btn btn-primary btn-sm mt" onclick="App.aiApply(' + i + ')">Apply this fix</button></span></li>').join('') + '</ul>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.aiDismiss()">Dismiss all</button>';
    } else {
      inner = '<p class="muted">Rule checks above are instant and free. For deeper work, DeepSeek proposes concrete rewrites you can apply with one click. Your CV text is sent to DeepSeek only when you click the button.</p>' +
        '<button class="btn btn-primary btn-sm" onclick="App.aiImprove()">✨ Get AI suggestions</button>';
    }
    return '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">AI improvements</h3><span class="prov prov-ai">DeepSeek</span></div>' + inner + '</div>';
  }

  const CV_STYLE =
    '.doc-wrap{background:#fff;border:1px solid var(--line);border-radius:12px;padding:26px 30px;max-height:560px;overflow:auto}' +
    '.cv-doc{font-family:Georgia,serif;color:#1c2733;font-size:.92rem;line-height:1.5}' +
    '.cv-doc .d-name{font-size:1.5rem;font-weight:700;text-align:center;margin:0}' +
    '.cv-doc .d-sub{text-align:center;color:var(--muted);font-size:.8rem;margin:2px 0 0}' +
    '.cv-doc .d-sec{margin-top:14px}' +
    '.cv-doc .d-sec>h4{font-size:.78rem;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #d8e0e8;margin:0 0 6px;padding-bottom:3px}' +
    '.cv-doc ul{margin:0;padding-inline-start:18px}' +
    '.cv-doc li{margin:2px 0;position:relative}' +
    '.tpl-modern .cv-doc{font-family:inherit}' +
    '.tpl-modern .cv-doc .d-name{color:var(--teal-d);text-align:left}' +
    '.tpl-modern .cv-doc .d-sub{text-align:left}' +
    '.tpl-modern .cv-doc .d-sec>h4{color:var(--teal-d);border-bottom:2px solid var(--teal)}' +
    '.tpl-executive .cv-doc{font-family:Georgia,serif}' +
    '.tpl-executive .cv-doc .d-name{background:#1f2a44;color:#fff;padding:12px 10px;border-radius:8px;letter-spacing:1px;font-size:1.35rem}' +
    '.tpl-executive .cv-doc .d-sec>h4{color:#1f2a44;border-bottom:2px solid #1f2a44;letter-spacing:3px}' +
    '.tpl-compact .cv-doc{font-family:inherit;font-size:.82rem;line-height:1.35}' +
    '.tpl-compact .cv-doc .d-name{font-size:1.2rem;text-align:left}' +
    '.tpl-compact .cv-doc .d-sub{text-align:left;font-size:.75rem}' +
    '.tpl-compact .cv-doc .d-sec{margin-top:8px}' +
    '.tpl-compact .cv-doc .d-sec>h4{font-size:.7rem;letter-spacing:1.5px;margin-bottom:3px;padding-bottom:2px}' +
    '.tpl-compact .cv-doc li{margin:1px 0}' +
    '.tpl-elegant .cv-doc{font-family:Georgia,serif}' +
    '.tpl-elegant .cv-doc .d-name{font-size:1.6rem;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#8a6d2f}' +
    '.tpl-elegant .cv-doc .d-sub{font-style:italic}' +
    '.tpl-elegant .cv-doc .d-sec>h4{color:#8a6d2f;border-bottom:1px solid #d9c48f;letter-spacing:3px}' +
    '.cv-edit{outline:2px dashed var(--teal);outline-offset:4px;max-height:none}' +
    '.cv-doc mark.cv-kw{background:#e0f2f0;color:var(--teal-d);border-radius:3px;padding:0 2px}' +
    '.cv-doc li.cv-fix{background:#fdf3e3;cursor:help}' +
    '.cv-doc li.cv-fix:hover{outline:1px dashed var(--amber)}' +
    '.cv-doc li.cv-good{background:#eafaf3}' +
    '.cv-fix-btn{display:none;position:absolute;inset-inline-end:4px;top:1px}' +
    '.cv-fix-btn button{font-size:.68rem;padding:2px 10px;border:0;border-radius:20px;background:var(--amber);color:#4a3200;cursor:pointer;font-weight:700;margin-inline-start:4px}' +
    '.cv-fix-btn button.ai{background:var(--teal);color:#fff}' +
    '.cv-doc li.cv-fix:hover .cv-fix-btn{display:inline-flex}';

  function cvExportCss(tpl) {
    let css = 'body{max-width:820px;margin:24px auto;padding:0 16px;color:#1c2733;line-height:1.5;font-family:Georgia,serif}' +
      '.d-name{font-size:26px;text-align:center;margin:0}.d-sub{text-align:center;color:#5a6b7c;font-size:13px;margin:2px 0}' +
      '.d-sec{margin-top:16px}.d-sec>h4{font-size:12px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #ccd6e0;margin:0 0 6px;padding-bottom:3px}' +
      'ul{margin:0;padding-left:20px}li{margin:3px 0}';
    if (tpl === 'modern') css += 'body{font-family:Arial,Helvetica,sans-serif}.d-name{color:#0f766e;text-align:left}.d-sub{text-align:left}.d-sec>h4{color:#0f766e;border-bottom:2px solid #14b8a6}';
    if (tpl === 'executive') css += '.d-name{background:#1f2a44;color:#fff;padding:16px 10px;border-radius:6px;letter-spacing:1px;font-size:22px}.d-sec>h4{color:#1f2a44;border-bottom:2px solid #1f2a44;letter-spacing:3px}';
    if (tpl === 'compact') css += 'body{font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.35}.d-name{font-size:20px;text-align:left}.d-sub{text-align:left;font-size:12px}.d-sec{margin-top:10px}.d-sec>h4{font-size:11px;letter-spacing:1.5px;margin-bottom:3px;padding-bottom:2px}li{margin:1px 0}';
    if (tpl === 'elegant') css += '.d-name{font-size:28px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#8a6d2f}.d-sub{font-style:italic}.d-sec>h4{color:#8a6d2f;border-bottom:1px solid #d9c48f;letter-spacing:3px}';
    return css + '@media print{body{margin:0}}';
  }

  const CV_HEADINGS = ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
    'CLINICAL EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'EDUCATION', 'LICENSES & CERTIFICATIONS',
    'LICENSES AND CERTIFICATIONS', 'LICENSES', 'CERTIFICATIONS', 'LICENSING', 'CORE COMPETENCIES', 'KEY COMPETENCIES',
    'AREAS OF EXPERTISE', 'CLINICAL SKILLS', 'KEY SKILLS', 'SKILLS', 'COMPETENCIES',
    'LANGUAGES', 'REFERENCES', 'AWARDS', 'PUBLICATIONS', 'TRAINING', 'COURSES', 'MEMBERSHIPS'];

  function structureCv(text) {
    const heads = CV_HEADINGS.map(escRe).join('|');
    const reCaps = new RegExp('\\b(' + heads + ')\\b', 'g');
    const isHeadAny = new RegExp('^(' + heads + ')$', 'i');
    const isHeadCaps = new RegExp('^(' + heads + ')$');
    const head = [], secs = [];
    let cur = null;
    String(text).replace(/\r/g, '').split('\n').forEach((raw) => {
      const ln0 = raw.trim();
      if (!ln0) return;
      if (isHeadAny.test(ln0)) { cur = { title: ln0.toUpperCase(), body: [] }; secs.push(cur); return; }
      ln0.replace(reCaps, (m) => '\n' + m + '\n').split('\n').map((s) => s.trim()).filter(Boolean).forEach((pt) => {
        if (isHeadCaps.test(pt)) { cur = { title: pt, body: [] }; secs.push(cur); }
        else if (cur) cur.body.push(pt);
        else head.push(pt);
      });
    });
    secs.forEach((s) => { s.items = s.body.join(' ').split('•').map((x) => x.trim()).filter(Boolean); });
    return { head, secs };
  }

  function splitLongItem(txt) {
    const out = [];
    (txt.match(/[^.;]+[.;]?/g) || [txt]).forEach((s) => {
      const t = s.replace(/[.;]\s*$/, '').trim();
      if (!t) return;
      if (t.split(/\s+/).length > 22 && t.indexOf(' — ') !== -1) {
        t.split(' — ').forEach((q) => { const u = q.trim(); if (u) out.push(u); });
      } else out.push(t);
    });
    const merged = [];
    out.forEach((p) => {
      if (merged.length && p.split(/\s+/).length < 5) merged[merged.length - 1] += '. ' + p;
      else merged.push(p);
    });
    return merged.slice(0, 4);
  }

  function cvDocHtml(st, withMarks) {
    const vocab = (typeof SKILLS_VOCAB !== 'undefined' ? SKILLS_VOCAB : []);
    const kwRe = (withMarks && vocab.length) ? new RegExp('\\b(' + vocab.map(escRe).join('|') + ')\\b', 'gi') : null;
    const quantRe = /\d+\s*%|\d+\s*\+?\s*(\w+\s+){0,2}(patients?|cases|procedures|beds|visits|years?|months?)\b|\b\d+\s*per (day|week)\b/i;
    let fix = 0, good = 0, kw = 0;
    const itemHtml = (txt) => {
      let h = esc(txt);
      if (kwRe) h = h.replace(kwRe, (m) => { kw++; return '<mark class="cv-kw">' + m + '</mark>'; });
      return h;
    };
    const itemCls = (txt) => {
      if (!withMarks) return '';
      if (quantRe.test(txt)) { good++; return 'cv-good'; }
      if (txt.split(/\s+/).filter(Boolean).length >= 25) { fix++; return 'cv-fix'; }
      return '';
    };
    let nameI = st.head.findIndex((ln) => !/@|\d|\|/.test(ln) && ln.split(/\s+/).filter(Boolean).length <= 6 && ln.length <= 60);
    if (nameI === -1) nameI = 0;
    const head = st.head.map((ln, i) => i === nameI
      ? '<h2 class="d-name">' + esc(ln) + '</h2>'
      : '<p class="d-sub">' + esc(ln) + '</p>').join('');
    const secs = st.secs.map((s, si) => '<div class="d-sec"><h4>' + esc(s.title) + '</h4><ul>' +
      s.items.map((it, ii) => {
        const c = itemCls(it);
        const w = it.split(/\s+/).filter(Boolean).length;
        const tip = c === 'cv-fix'
          ? ' title="Long item (' + w + ' words). Hover for one-click fixes: rule-based Split or an AI rewrite."'
          : (c === 'cv-good' ? ' title="Quantified achievement — recruiters and ATS systems love numbers. Keep it."' : '');
        const btn = (withMarks && c === 'cv-fix')
          ? '<span class="cv-fix-btn"><button onclick="App.autoSplit(' + si + ', ' + ii + ');return false;">Split into bullets</button>' +
            '<button class="ai" title="DeepSeek rewrites this item (facts preserved)" onclick="App.aiRewrite(' + si + ', ' + ii + ');return false;">✨ AI rewrite</button></span>'
          : '';
        return '<li' + (c ? ' class="' + c + '"' : '') + tip + '>' + itemHtml(it) + btn + '</li>';
      }).join('') + '</ul></div>').join('');
    return { html: '<div class="cv-doc">' + head + secs + '</div>', fix, good, kw };
  }

  function applyCvText(text, label) {
    const ext = Engine.extractFromText(text);
    const prevCities = state.profile.preferredCities;
    const prevSalary = state.profile.preferredSalary;
    const prevName = state.profile.fullName, prevPhone = state.profile.phone;
    state.profile = flattenExtraction(ext);
    if (prevCities && prevCities.length) state.profile.preferredCities = prevCities;
    if (prevSalary) state.profile.preferredSalary = prevSalary;
    if (!state.profile.fullName && prevName) state.profile.fullName = prevName;
    if (!state.profile.phone && prevPhone) state.profile.phone = prevPhone;
    state.cvText = text;
    cvFileClear();
    aiFixes = [];
    const r2 = analyzeCv(text, state.profile);
    if (!state.atsHistory) state.atsHistory = [];
    const prev = state.atsHistory.length > 1 ? state.atsHistory[state.atsHistory.length - 1].score : null;
    state.atsHistory.push({ t: Date.now(), score: r2.score });
    if (state.atsHistory.length > 10) state.atsHistory = state.atsHistory.slice(-10);
    embState.cvVec = null;
    embState.ready = false;
    cvEditMode = false;
    save();
    render();
    toast(label + ' — ATS score ' + r2.score + (prev === null ? '' : ' (' + (r2.score - prev >= 0 ? '+' : '') + (r2.score - prev) + ')'), 'ok');
    warmupSemantic(false);
  }

  function cvToolbar(file, view) {
    return '<div class="flex wrap" style="gap:8px;align-items:center;margin-bottom:10px">' +
      (file ? '<div class="tabs" style="margin:0">' +
        '<a href="#" class="' + (view === 'original' ? 'active' : '') + '" onclick="App.setCvView(\'original\');return false;">Original</a>' +
        '<a href="#" class="' + (view === 'doc' ? 'active' : '') + '" onclick="App.setCvView(\'doc\');return false;">Document</a></div>' : '') +
      (view === 'doc'
        ? '<select class="input" style="width:auto;padding:6px 10px" onchange="App.setCvTpl(this.value)">' +
          Object.keys(CV_TPLS).map((k) => '<option value="' + k + '"' + (cvTpl === k ? ' selected' : '') + '>' + CV_TPLS[k] + '</option>').join('') + '</select>' +
          '<label class="check-chip"><input type="checkbox"' + (cvMarks ? ' checked' : '') + ' onchange="App.toggleCvMarks(this.checked)"> Mark issues</label>'
        : '') +
      '<button class="btn btn-outline btn-sm" onclick="App.toggleCvEdit()">Edit in place</button>' +
      '<span style="flex:1"></span>' +
      (file ? '<button class="btn btn-ghost btn-sm" onclick="App.downloadOriginal()">Original PDF</button>' : '') +
      '<button class="btn btn-ghost btn-sm" onclick="App.downloadCv(\'html\')">.html</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.downloadCv(\'txt\')">.txt</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.downloadCv(\'pdf\')">PDF / print</button></div>';
  }

  function cvReviewCard(a) {
    const file = cvFileGet();
    const view = (cvView === 'doc' || !file) ? 'doc' : 'original';
    let body;
    if (cvEditMode) {
      const st = structureCv(state.cvText);
      const doc = cvDocHtml(st, false);
      body = cvToolbar(file, 'doc') +
        '<p class="muted">Click into the document and edit it directly, then save — the report, your profile and every match score update instantly.</p>' +
        '<div class="doc-wrap tpl-' + cvTpl + ' cv-edit" id="cvEditor" contenteditable="true" spellcheck="false" oninput="App.updateCvCount(this.innerText)">' + doc.html + '</div>' +
        '<div class="flex between mt wrap"><span class="muted" id="cvEditCount">' + a.words + ' words</span>' +
        '<span class="flex wrap"><button class="btn btn-primary btn-sm" onclick="App.saveCvEdit()">Save &amp; re-analyze</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.toggleCvEdit(false)">Cancel</button></span></div>';
    } else if (view === 'original') {
      body = cvToolbar(file, view) +
        '<iframe src="' + esc(file.data) + '" title="Original CV" style="width:100%;height:560px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe>' +
        '<p class="muted" style="margin:8px 0 0;font-size:.82rem">Your original file, exactly as uploaded — fonts, colors and layout untouched. To change content, switch to Document and choose Edit in place.</p>';
    } else {
      const st = structureCv(state.cvText);
      const doc = cvDocHtml(st, cvMarks);
      body = cvToolbar(file, view) +
        (cvMarks ? '<div class="flex wrap" style="gap:12px;margin-bottom:8px">' +
          '<span class="muted" style="font-size:.8rem"><span style="color:var(--amber)">■</span> ' + doc.fix + ' long item' + (doc.fix === 1 ? '' : 's') + ' — hover one for <b>Split</b> or <b>AI rewrite</b></span>' +
          '<span class="muted" style="font-size:.8rem"><span style="color:var(--green)">■</span> ' + doc.good + ' quantified — keep these</span>' +
          '<span class="muted" style="font-size:.8rem"><span style="color:var(--teal-d)">■</span> ' + doc.kw + ' clinical keyword hits</span></div>' : '') +
        '<div class="doc-wrap tpl-' + cvTpl + '">' + doc.html + '</div>';
    }
    return '<style>' + CV_STYLE + '</style><div class="card mt-lg"><div class="flex between"><h3 style="margin:0">CV review</h3></div>' + body + '</div>';
  }

  /* ---------- analysis page extras (v22) ---------- */
  function quickFixesCard() {
    const p = state.profile;
    const opt = (cur, vals) => vals.map((o) => '<option value="' + o + '"' + (cur === o ? ' selected' : '') + '>' + (o || '—') + '</option>').join('');
    return '<div class="card mt-lg"><h3>Quick fixes</h3>' +
      '<p class="muted">Fix what the parser missed — these write straight to your profile, so match scores update immediately.</p>' +
      '<div class="grid grid-2">' +
      '<div class="field"><label>Full name</label><input class="input" id="qfName" value="' + esc(p.fullName) + '"></div>' +
      '<div class="field"><label>Phone (with country code)</label><input class="input" id="qfPhone" value="' + esc(p.phone) + '"></div>' +
      '<div class="field"><label>SCFHS registration</label><select class="input" id="qfScfhs">' + opt(p.scfhsRegistration, ['', 'Yes', 'In progress', 'No']) + '</select></div>' +
      '<div class="field"><label>DataFlow verification</label><select class="input" id="qfDataflow">' + opt(p.dataflow, ['', 'Completed', 'In progress', 'Not started']) + '</select></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" onclick="App.saveQuickFixes()">Save fixes &amp; re-score</button></div>';
  }

  function marketKeywords() {
    const jobs = (typeof DEMO_JOBS !== 'undefined') ? DEMO_JOBS : [];
    const p = state.profile;
    const pool = jobs.filter((j) => !p.profession || j.profession === p.profession);
    const freq = {};
    pool.forEach((j) => (j.skills || []).forEach((s) => { freq[s] = (freq[s] || 0) + 1; }));
    const have = new Set((p.skills || []).map((s) => String(s).toLowerCase()));
    return Object.keys(freq).map((s) => ({ s, n: freq[s], has: have.has(s.toLowerCase()) }))
      .sort((a, b) => b.n - a.n).slice(0, 10);
  }

  function marketCard() {
    const mk = marketKeywords();
    if (!mk.length) return '';
    const have = mk.filter((k) => k.has).length;
    return '<div class="card mt-lg"><h3>What employers ask for</h3>' +
      '<p class="muted">Most-demanded skills across live ' + esc(state.profile.profession ? T_PROF(state.profile.profession) : 'healthcare') +
      ' postings — your CV covers <b>' + have + ' of ' + mk.length + '</b>.</p>' +
      '<div class="flex wrap">' + mk.map((k) => '<span class="badge ' + (k.has ? 'badge-green' : 'badge-gray') + '">' +
      (k.has ? '✓ ' : '+ ') + esc(k.s) + ' · ' + k.n + '</span>').join('') + '</div>' +
      (have < mk.length
        ? '<p class="muted" style="margin:10px 0 0;font-size:.85rem">Add the “+” skills you genuinely have to your CV, then re-analyze — each one raises your keyword coverage and your match scores.</p>'
        : '') +
      '</div>';
  }

  function topMatchesCard() {
    const top = topMatches(3);
    if (!top.length) return '';
    return '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">Your top matches right now</h3>' +
      '<button class="btn btn-outline btn-sm" onclick="App.go(\'jobs\')">' + t('browseJobs') + '</button></div>' +
      top.map(({ job, res }) => '<div class="list-row"><span><b>' + esc(job.title) + '</b> <span class="muted">' +
        esc(job.employer) + ' · ' + esc(T_CITY(job.city)) + '</span></span>' +
        '<span class="flex">' + matchBadge(res.final) +
        ' <button class="btn btn-primary btn-sm" onclick="App.openJob(\'' + job.id + '\')">' + t('viewAnalysis') + '</button></span></div>').join('') +
      '</div>';
  }

  /* ---------- nav / footer ---------- */
  function navLink(route, label) {
    return '<a href="#" class="' + (state.route === route ? 'active' : '') + '" onclick="App.go(\'' + route + '\');return false;">' + label + '</a>';
  }

  function unreadNotifs() {
    if (!currentUser || !state.cvText) return [];
    return topMatches(3).filter(({ job, res }) => res.final >= 60 && state.notifsReadIds.indexOf(job.id) === -1);
  }

  function notifsView() {
    let h = '<div class="notif-item" style="display:flex;justify-content:space-between;align-items:center;background:#fff;position:sticky;top:0">' +
      '<b>' + t('notifications') + '</b>' +
      (unreadNotifs().length ? '<button class="btn btn-ghost btn-sm" onclick="App.markNotifsRead(event)">' + t('markAllRead') + '</button>' : '') +
      '</div>';
    if (!currentUser) {
      h += '<div class="notif-item">' + t('notifGuest1') + '</div>' +
        '<div class="notif-item" style="cursor:pointer" onclick="App.closeMenus();App.openAuth(\'signup\')"><b>' + t('notifGuest2') + '</b></div>';
      return h;
    }
    const top = state.cvText ? topMatches(3).filter(({ res }) => res.final >= 60) : [];
    if (!top.length) {
      h += '<div class="notif-item muted">' + t('notifEmpty') + '</div>';
    } else {
      h += top.map(({ job, res }) => {
        const isNew = state.notifsReadIds.indexOf(job.id) === -1;
        return '<div class="notif-item' + (isNew ? ' unread' : '') + '" style="cursor:pointer" title="Open job analysis" onclick="App.openNotif(\'' + job.id + '\')">' +
          '<b>' + res.final + '%</b> — ' + esc(job.title) +
          '<br><span class="muted">' + esc(job.employer) + ' · ' + esc(T_CITY(job.city)) + '</span></div>';
      }).join('');
    }
    h += '<div class="notif-item muted" style="font-size:.78rem">' + t('notifTip') + '</div>';
    return h;
  }

  function accountArea() {
    if (!currentUser) {
      return '<button class="btn btn-outline btn-sm" onclick="App.openAuth(\'signin\')">' + t('signIn') + '</button>' +
        '<button class="btn btn-primary btn-sm" onclick="App.openAuth(\'signup\')">' + t('signUp') + '</button>';
    }
    const initials = currentUser.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U';
    return '<div class="user-menu">' +
      '<button class="avatar" title="Account" onclick="App.toggleAccountMenu(event)">' + esc(initials) + '</button>' +
      '<div class="menu hidden" id="acctMenu">' +
      '<div style="padding:9px 12px;border-bottom:1px solid var(--line)"><b>' + esc(currentUser.name) + '</b><br>' +
      '<small class="muted">' + esc(currentUser.email) + (currentUser.cloud ? ' · ☁' : '') + '</small></div>' +
      '<button onclick="App.closeMenus();App.go(\'dashboard\')">📊 ' + t('navDash') + '</button>' +
      '<button onclick="App.closeMenus();App.go(\'analysis\')">📄 ' + t('navAnalysis') + '</button>' +
      '<button onclick="App.signOut()">↩ ' + t('signOut') + '</button>' +
      '</div></div>';
  }

  function navView() {
    const unread = unreadNotifs().length;
    return '<nav class="nav"><div class="nav-inner">' +
      '<button class="burger" onclick="App.toggleMenu()" aria-label="Menu">☰</button>' +
      '<a class="brand" href="#" onclick="App.go(\'home\');return false;"><span class="logo">✚</span>Med<em>Match</em></a>' +
      '<div class="nav-links" id="navLinks">' +
      navLink('home', t('navHome')) + navLink('jobs', t('navJobs')) + navLink('upload', t('navUpload')) +
      navLink('analysis', t('navAnalysis')) + navLink('dashboard', t('navDash')) +
      '</div><div class="nav-cta">' +
      '<button class="btn btn-ghost btn-sm" style="font-weight:700" title="Language / اللغة" onclick="App.toggleLang()">' + (lang === 'ar' ? 'EN' : 'عربي') + '</button>' +
      '<div class="user-menu">' +
      '<button class="bell" onclick="App.toggleBell(event)" title="' + t('notifications') + '">🔔' + (unread ? '<span class="dot">' + unread + '</span>' : '') + '</button>' +
      '<div class="notif-panel hidden" id="notifPanel">' + notifsView() + '</div>' +
      '</div>' +
      accountArea() +
      '</div></div></nav>';
  }

  function footerView() {
    return '<footer class="footer"><div class="container"><div class="cols">' +
      '<div><h5>MedMatch</h5><p>' + t('footAbout') + '</p></div>' +
      '<div><h5>' + t('footProduct') + '</h5><ul>' +
      '<li><a href="#" onclick="App.go(\'jobs\');return false;">' + t('navJobs') + '</a></li>' +
      '<li><a href="#" onclick="App.go(\'upload\');return false;">' + t('navUpload') + '</a></li>' +
      '<li><a href="#" onclick="App.go(\'analysis\');return false;">' + t('navAnalysis') + '</a></li>' +
      '<li><a href="#" onclick="App.go(\'dashboard\');return false;">' + t('navDash') + '</a></li></ul></div>' +
      '<div><h5>' + t('footLicensing') + '</h5><ul><li>SCFHS</li><li>DataFlow</li><li>Prometric / SMLE</li></ul></div>' +
      '<div><h5>' + t('footLegal') + '</h5><ul><li><a href="privacy.html">' + t('privacyLink') + '</a></li></ul>' +
      '<h5 style="margin-top:12px">' + t('footData') + '</h5><ul><li>' + JOB_SOURCES.length + ' ' + t('thSource') + '</li><li>' + DEMO_JOBS.length + ' ' + t('footJobs') + '</li></ul></div>' +
      '</div><p style="margin:0">' + t('footRights') + '</p></div></footer>';
  }

  /* ---------- auth modal ---------- */
  function authView(mode) {
    const isUp = mode === 'signup';
    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal">' +
      '<div class="flex between"><h3 style="margin:0">' + (isUp ? t('authCreate') : t('authBack')) + '</h3>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<div class="tabs mt">' +
      '<a href="#" class="' + (!isUp ? 'active' : '') + '" onclick="App.openAuth(\'signin\');return false;">' + t('signIn') + '</a>' +
      '<a href="#" class="' + (isUp ? 'active' : '') + '" onclick="App.openAuth(\'signup\');return false;">' + t('signUp') + '</a></div>' +
      (isUp ? '<div class="field"><label>' + t('authName') + '</label><input class="input" id="authName" placeholder="مثال: د. سارة أحمد / Dr. Sara Ahmed"></div>' : '') +
      '<div class="field"><label>' + t('authEmail') + '</label><input class="input" id="authEmail" type="email" placeholder="you@example.com" onkeydown="if(event.key===\'Enter\')App.submitAuth(\'' + mode + '\')"></div>' +
      '<div id="authErr" class="hidden" style="color:var(--red);font-size:.85rem;margin-bottom:10px"></div>' +
      '<button class="btn btn-primary btn-block" onclick="App.submitAuth(\'' + mode + '\')">' + t('magicBtn') + '</button>' +
      '<p class="muted mt" style="font-size:.78rem;margin:10px 0 0">' + t('magicFoot') +
      ' ' + t('agree') + ' <a href="privacy.html" target="_blank" rel="noopener">' + t('privacyLink') + '</a>.</p>' +
      '</div></div>';
  }

  /* ---------- auth gate ---------- */
  const GATED = { upload: 1, analysis: 1, dashboard: 1 };

  function lockedView(route) {
    const names = { upload: t('navUpload'), analysis: t('navAnalysis'), dashboard: t('navDash') };
    return '<section class="section"><div class="container" style="max-width:560px">' +
      '<div class="card empty"><div class="ic">🔒</div>' +
      '<h3>' + tr('lockedH', { page: names[route] || '' }) + '</h3>' +
      '<p>' + t('lockedX') + '</p>' +
      '<div class="flex mt" style="justify-content:center">' +
      '<button class="btn btn-primary" onclick="App.openAuth(\'signup\')">' + t('createAccount') + '</button>' +
      '<button class="btn btn-outline" onclick="App.openAuth(\'signin\')">' + t('signIn') + '</button></div>' +
      '<p class="muted mt" style="font-size:.8rem">' + t('lockedNote') + '</p>' +
      '</div></div></section>';
  }

  /* ---------- views ---------- */
  function step(n, title, text) {
    return '<div class="card hover"><div class="step-num">' + n + '</div><h3>' + title + '</h3><p class="muted">' + text + '</p></div>';
  }

  function homeView() {
    const strength = Engine.profileStrength(state.profile);
    return '<section class="hero"><div class="container hero-grid"><div>' +
      '<span class="eyebrow">' + t('eyebrow') + '</span>' +
      '<h1>' + t('heroH1a') + ' <span style="color:var(--teal-d)">' + t('heroH1b') + '</span> ' + t('heroH1c') + '</h1>' +
      '<p class="lead">' + t('heroLead') + '</p>' +
      '<div class="flex wrap mt">' +
      (currentUser
        ? '<button class="btn btn-primary btn-lg" onclick="App.go(\'upload\')">' + t('uploadCv') + '</button>'
        : '<button class="btn btn-primary btn-lg" onclick="App.openAuth(\'signup\')">' + t('createFree') + '</button>') +
      '<button class="btn btn-outline btn-lg" onclick="App.go(\'jobs\')">' + t('browseJobs') + '</button></div>' +
      '<div class="stats-row">' +
      '<div class="stat"><b>' + DEMO_JOBS.length + '</b><span>' + t('statJobs') + '</span></div>' +
      '<div class="stat"><b>' + JOB_SOURCES.length + '</b><span>' + t('statSources') + '</span></div>' +
      '<div class="stat"><b>' + (CITIES.length - 1) + '</b><span>' + t('statCities') + '</span></div>' +
      '<div class="stat"><b>' + (PROFESSIONS.length - 1) + '</b><span>' + t('statProf') + '</span></div>' +
      '</div></div>' +
      '<div class="hero-card"><div class="flex between"><h3 style="margin:0">' + t('profStrength') + '</h3>' + ring(strength, 'teal') + '</div>' +
      '<div class="progress mt"><div style="width:' + strength + '%"></div></div>' +
      '<p class="muted mt">' + (currentUser ? (state.cvText ? t('heroCardCv') : t('heroCardNoCv')) : t('heroCardGuest')) + '</p>' +
      (currentUser
        ? '<button class="btn btn-blue btn-block" onclick="App.go(\'dashboard\')">' + t('goDash') + '</button>'
        : '<button class="btn btn-blue btn-block" onclick="App.openAuth(\'signin\')">' + t('signIn') + '</button>') +
      '</div></div></section>' +
      '<section class="section"><div class="container">' +
      '<h2 class="center">' + t('howTitle') + '</h2><div class="grid grid-3 mt-lg">' +
      step(1, t('step1t'), t('step1x')) +
      step(2, t('step2t'), t('step2x')) +
      step(3, t('step3t'), t('step3x')) +
      '</div></div></section>';
  }

  /* ---------- jobs view ---------- */
  const GUEST_JOB_LIMIT = 6;

  function jobsView() {
    const all = filteredJobs();
    const isGuest = !currentUser;
    const list = isGuest ? all.slice(0, GUEST_JOB_LIMIT) : all;
    const hidden = all.length - list.length;

    return '<section class="section"><div class="container">' +
      '<div class="dash-head"><div><h2 style="margin:0">' + t('jobsTitle') + '</h2>' +
      '<p class="muted" style="margin:4px 0 0">' +
      (isGuest
        ? tr('guestCount', { a: list.length, b: all.length })
        : tr('jobsCount', { a: all.length, b: DEMO_JOBS.length }) +
          (embState.ready ? ' · <span class="prov prov-ai">' + t('jobsAiOn') + '</span>' : '')) +
      '</p></div></div>' +
      '<div class="ai-search"><div class="field" style="margin:0"><label>' + t('nlLabel') + '</label>' +
      '<input class="input" id="nlInput" placeholder="' + esc(t('nlPh')) + '" value="' + esc(state.filters.nl) + '" onkeydown="if(event.key===\'Enter\')App.aiSearch()">' +
      '<div class="hint mt"><button class="btn btn-primary btn-sm" onclick="App.aiSearch()">' + t('search') + '</button> ' +
      (state.filters.nl ? '<button class="btn btn-ghost btn-sm" onclick="App.clearNl()">' + t('clear') + '</button>' : '') +
      '</div></div></div>' +
      '<div class="jobs-layout"><aside class="filters card">' +
      '<h4>' + t('fProfession') + '</h4>' + select('profession', PROFESSIONS, T_PROF) +
      '<h4>' + t('fCity') + '</h4>' + select('city', CITIES, T_CITY) +
      '<h4>' + t('fEmployment') + '</h4>' + select('employment', EMPLOYMENT_TYPES, T_EMP) +
      '<h4>' + t('fSalary') + '</h4>' +
      '<input class="input" type="number" min="0" placeholder="12000" value="' + esc(state.filters.minSalary) + '" onchange="App.setFilter(\'minSalary\', this.value)">' +
      '<button class="btn btn-ghost btn-sm mt" onclick="App.resetFilters()">' + t('fReset') + '</button>' +
      '</aside>' +
      '<div class="grid">' +
      (list.length
        ? list.map(isGuest ? guestJobCard : jobCard).join('')
        : emptyState(t('noJobs'), t('noJobsSub'))) +
      (isGuest && hidden > 0 ? teaserWall(hidden) : '') +
      '</div></div></div></section>';
  }

  function guestJobCard({ job }) {
    const blur = 'filter:blur(6px);user-select:none;pointer-events:none';
    return '<div class="card job-card"><div class="job-top"><div>' +
      '<p class="job-title">' + esc(job.title) + '</p>' +
      '<div class="job-emp"><span style="' + blur + '" aria-hidden="true">Al Confidential Hospital Group</span> · ' + esc(T_CITY(job.city)) + '</div></div>' +
      '<span class="badge badge-gray">' + t('guestLock') + '</span></div>' +
      '<div class="job-meta">' +
      '<span class="badge badge-gray">' + esc(T_PROF(job.profession)) + '</span>' +
      '<span class="badge badge-blue">' + esc(T_EMP(job.employment)) + '</span>' +
      '<span class="badge badge-teal" style="' + blur + '" aria-hidden="true">SAR 00,000–00,000</span>' +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + '</span>' +
      '</div><div class="job-actions">' +
      '<button class="btn btn-primary btn-sm" onclick="App.openAuth(\'signup\')">' + t('guestBtn') + '</button>' +
      '<span class="muted" style="font-size:.78rem">' + posted(job.postedDaysAgo) + '</span>' +
      '</div></div>';
  }

  function teaserWall(hidden) {
    return '<div class="card empty" style="border:2px dashed var(--teal);background:#f0faf8">' +
      '<div class="ic">🔒</div>' +
      '<h3>' + tr('teaserH', { n: hidden }) + '</h3>' +
      '<p>' + t('teaserX') + '</p>' +
      '<div class="flex mt" style="justify-content:center">' +
      '<button class="btn btn-primary" onclick="App.openAuth(\'signup\')">' + t('createFree') + '</button>' +
      '<button class="btn btn-outline" onclick="App.openAuth(\'signin\')">' + t('signIn') + '</button></div>' +
      '</div>';
  }

  function jobCard({ job, res }) {
    const pair = Engine.matchLabel(res.final);
    const color = pair[1];
    const st = state.saved[job.id];
    return '<div class="card hover job-card"><div class="job-top"><div>' +
      '<p class="job-title">' + esc(job.title) + '</p>' +
      '<div class="job-emp">' + esc(job.employer) + ' · ' + esc(T_CITY(job.city)) + '</div></div>' +
      '<div class="ring-wrap">' + ring(res.final, color) + '<div class="ring-sub">' + matchBadge(res.final) +
      (res.semantic !== null && res.semantic !== undefined ? ' <span class="prov prov-ai">AI</span>' : '') +
      (res.boost ? ' <span class="prov prov-user">+' + res.boost + '</span>' : '') +
      '</div></div></div>' +
      '<div class="job-meta">' +
      '<span class="badge badge-gray">' + esc(T_PROF(job.profession)) + '</span>' +
      '<span class="badge badge-blue">' + esc(T_EMP(job.employment)) + '</span>' +
      salaryBadge(job) +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + ' ' + t('years') + '</span>' +
      (job.applyIsDirect ? '<span class="badge badge-green">' + t('applyBtn').replace(' ↗', '') + '</span>' : '') +
      (job.demo ? '<span class="badge badge-demo">Demo</span>' : '') +
      (st ? '<span class="status-pill st-' + st + '">' + esc(T_STATUS(st)) + '</span>' : '') +
      '</div><div class="job-actions">' +
      '<button class="btn btn-primary btn-sm" onclick="App.openJob(\'' + job.id + '\')">' + t('viewAnalysis') + '</button>' +
      '<button class="btn btn-outline btn-sm" onclick="App.setStatus(\'' + job.id + '\',\'' + (st === 'saved' ? '' : 'saved') + '\')">' + (st === 'saved' ? t('unsave') : t('save')) + '</button>' +
      '<span class="muted" style="font-size:.78rem">' + posted(job.postedDaysAgo) + ' · ' + esc(job.source) + '</span>' +
      '</div></div>';
  }

  function uploadView() {
    return '<section class="section"><div class="container" style="max-width:820px">' +
      '<div class="stepper">' +
      '<div class="st done" data-n="1">' + t('step1') + '</div>' +
      '<div class="st ' + (state.cvText ? 'done' : '') + '" data-n="2">' + t('step2') + '</div>' +
      '<div class="st ' + (state.cvText ? 'done' : '') + '" data-n="3">' + t('step3') + '</div></div>' +
      '<div class="card"><h2>' + t('upTitle') + '</h2>' +
      '<p class="muted">' + t('upIntro') + '</p>' +
      '<div class="dropzone" id="dz">' +
      '<div class="ic">📄</div><b>' + t('upDrop') + '</b>' +
      '<div class="hint">' + t('upHint') + '</div></div>' +
      '<input type="file" id="cvFile" accept=".txt,.md,.pdf" class="hidden">' +
      '<div class="field mt"><label>' + t('upCvText') + '</label>' +
      '<textarea class="input" id="cvText" placeholder="' + esc(t('upPaste')) + '">' + esc(state.cvText) + '</textarea></div>' +
      '<div class="flex wrap">' +
      '<button class="btn btn-primary" onclick="App.analyze()">' + t('analyzeBtn') + '</button>' +
      '<button class="btn btn-outline" onclick="App.loadSample()">' + t('sampleBtn') + '</button>' +
      (state.cvText ? '<button class="btn btn-danger" onclick="App.clearCv()">' + t('clearBtn') + '</button>' : '') +
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
      return '<label class="check-chip"><input type="checkbox" data-city="' + esc(c) + '"' + (on ? ' checked' : '') + '> ' + esc(T_CITY(c)) + '</label>';
    }).join('');
    return '<div class="card"><h3>' + t('yourPrefs') + '</h3>' +
      '<p class="muted" style="font-size:.88rem">' + t('prefsX') + '</p>' +
      '<div class="field"><label>' + t('prefCities') + '</label><div class="checks" id="prefCities">' + chips + '</div></div>' +
      '<div class="field"><label>' + t('prefSalary') + '</label>' +
      '<input class="input" type="number" min="0" id="prefSalary" placeholder="14000" value="' + esc(p.preferredSalary || '') + '"></div>' +
      '<div class="field"><label>' + t('prefAlerts') + '</label>' +
      '<label class="check-chip"><input type="checkbox" id="prefAlerts"' + (state.alertOptIn ? ' checked' : '') + '> ' + t('prefAlertsOn') + '</label></div>' +
      '<button class="btn btn-primary btn-sm" onclick="App.savePrefs()">' + t('savePrefs') + '</button></div>';
  }

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

    let h = '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">' + t('actTitle') + '</h3>' +
      (ev.length ? '<button class="btn btn-ghost btn-sm" onclick="App.clearActivity()">' + t('clearActivity') + '</button>' : '') + '</div>';
    if (!ev.length) {
      h += '<p class="muted">' + t('actEmpty') + '</p></div>';
      return h;
    }
    h += '<div class="list-row"><span class="muted">' + t('act30') + '</span><span><b>' + views + '</b> ' + t('actViews') + ' · <b>' + saves + '</b> ' + t('actSaves') + ' · <b>' + applies + '</b> ' + t('actApplies') + '</span></div>' +
      '<div class="list-row"><span class="muted">' + t('actTotal') + '</span><span>' + ev.length + '</span></div>' +
      (topProf ? '<div class="list-row"><span class="muted">' + t('actProf') + '</span><span>' + esc(T_PROF(topProf)) + ' <span class="prov prov-user">+' + Math.min(6, byProf[topProf]) + ' ' + t('boost') + '</span></span></div>' : '') +
      (topCity ? '<div class="list-row"><span class="muted">' + t('actCity') + '</span><span>' + esc(T_CITY(topCity)) + ' <span class="prov prov-user">+' + Math.min(4, byCity[topCity]) + ' ' + t('boost') + '</span></span></div>' : '') +
      '<p class="muted mt" style="font-size:.82rem">' + t('actHow') + '</p></div>';
    return h;
  }

  function privacyCard() {
    return '<div class="card mt-lg"><h3>' + t('privTitle') + '</h3>' +
      '<div class="list-row"><span class="muted">' + t('privStorage') + '</span><span>' +
      (currentUser && currentUser.cloud ? t('privStorageCloud') : '—') + '</span></div>' +
      '<div class="list-row"><span class="muted">' + t('privAlerts') + '</span><span>' + (state.alertOptIn ? t('privAlertsOn') : t('privAlertsOff')) + '</span></div>' +
      '<div class="list-row"><span class="muted">' + t('privShared') + '</span><span>' + t('privSharedNo') + '</span></div>' +
      '<div class="flex mt wrap">' +
      '<a class="btn btn-outline btn-sm" href="privacy.html" target="_blank" rel="noopener">' + t('privRead') + '</a>' +
      '<button class="btn btn-danger btn-sm" onclick="App.deleteAccount()">' + t('privDelete') + '</button></div>' +
      '<p class="muted mt" style="font-size:.78rem;margin:8px 0 0">' + t('privNote') + '</p></div>';
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
      '<div class="dash-head"><div><h2 style="margin:0">' + t('dashTitle') + '</h2>' +
      '<p class="muted" style="margin:4px 0 0">' + (displayName ? tr('welcome', { name: esc(displayName) }) : t('dashOverview')) +
      (currentUser ? ' · ' + t('signedInAs') + ' ' + esc(currentUser.email) + (currentUser.cloud ? ' · ' + t('synced') : '') : '') + '</p></div>' +
      '<div class="flex wrap">' +
      (state.cvText ? '<button class="btn btn-primary" onclick="App.go(\'analysis\')">' + t('atsReport') + '</button>' : '') +
      '<button class="btn btn-outline" onclick="App.go(\'upload\')">' + (state.cvText ? t('reanalyze') : t('uploadCv')) + '</button></div></div>' +
      '<div class="grid grid-4">' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'' + cvRoute + '\')"><div class="ic" style="background:#e6f7f4">📊</div><div><b>' + comp + '%</b><br><span class="muted">' + t('mComplete') + '</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'' + cvRoute + '\')"><div class="ic" style="background:#e8effe">💪</div><div><b>' + strength + '%</b><br><span class="muted">' + t('mStrength') + '</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.go(\'jobs\')"><div class="ic" style="background:#e8f8ee">🎯</div><div><b>' + good + '</b><br><span class="muted">' + t('mMatches') + '</span></div></div>' +
      '<div class="card stat-mini hover" style="cursor:pointer" onclick="App.goAnchor(\'dashboard\',\'savedJobs\')"><div class="ic" style="background:#f1eafe">🔖</div><div><b>' + savedIds.length + '</b><br><span class="muted">' + t('mSaved') + '</span></div></div></div>' +
      '<div class="grid grid-2 mt-lg">' +
      '<div class="card"><h3>' + t('yourProfile') + '</h3>' +
      profileRow(t('pName'), p.fullName, !!p.fullName) +
      profileRow(t('pEmail'), p.email, !!p.email) +
      profileRow(t('pPhone'), p.phone, !!p.phone) +
      profileRow(t('pProfession'), T_PROF(p.profession || '—').replace('—', ''), !!p.profession) +
      profileRow(t('pSpecialty'), p.specialty, !!p.specialty) +
      profileRow(t('pExperience'), p.years != null ? p.years + ' ' + t('years') : '', p.years != null) +
      profileRow(t('pLocation'), T_CITY(p.location || '') || p.currentCountry, !!(p.location || p.currentCountry)) +
      profileRow(t('pScfhsC'), p.scfhsClassification, !!p.scfhsClassification) +
      profileRow(t('pScfhsR'), p.scfhsRegistration, !!p.scfhsRegistration) +
      profileRow(t('pDataflow'), p.dataflow, !!p.dataflow) +
      profileRow(t('pSkills'), p.skills, p.skills.length > 0) +
      profileRow(t('pCerts'), p.certs, p.certs.length > 0) +
      '<div class="mt"><div class="flex between"><span class="muted">' + t('pCompleteness') + '</span><b>' + comp + '%</b></div>' +
      '<div class="progress"><div style="width:' + comp + '%"></div></div></div></div>' +
      '<div>' + prefsCard() + '</div>' +
      '</div>' +
      '<div class="card mt-lg"><div class="flex between"><h3 style="margin:0">' + t('improveTitle') + '</h3>' +
      (state.cvText ? '<button class="btn btn-ghost btn-sm" onclick="App.go(\'analysis\')">' + t('fullAts') + '</button>' : '') + '</div>';

    if (!state.cvText) {
      h += emptyState(t('noCv'), t('noCvSub'));
    } else if (!tips.length) {
      h += '<p class="muted">—</p>';
    } else {
      const mark = { high: ['mk-bad', '✕'], medium: ['mk-warn', '!'], low: ['mk-info', 'i'], ok: ['mk-ok', '✓'] };
      h += '<ul class="analysis-list">' + tips.map((x) => {
        const m = mark[x.sev] || mark.low;
        return '<li><span class="mk ' + m[0] + '">' + m[1] + '</span><span><b>' + esc(x.title) + '</b><br><span class="muted">' + esc(x.detail) + '</span></span></li>';
      }).join('') + '</ul>';
    }
    h += '</div>';

    h += insightsCard();

    h += '<div class="card mt-lg" id="savedJobs"><h3>' + t('savedTitle') + '</h3>';
    if (!savedIds.length) {
      h += '<p class="muted">' + t('savedEmpty') + '</p>';
    } else {
      h += '<div class="table-wrap"><table><thead><tr><th>' + t('thJob') + '</th><th>' + t('thMatch') + '</th><th>' + t('thStatus') + '</th><th></th></tr></thead><tbody>';
      savedIds.forEach((id) => {
        const item = scoredJobs().find((x) => x.job.id === id);
        if (!item) return;
        const st = state.saved[id];
        h += '<tr><td><b>' + esc(item.job.title) + '</b><br><span class="muted">' + esc(item.job.employer) + ' · ' + esc(T_CITY(item.job.city)) + '</span></td>' +
          '<td>' + matchBadge(item.res.final) + '</td>' +
          '<td><span class="status-pill st-' + st + '">' + esc(T_STATUS(st)) + '</span></td>' +
          '<td class="flex wrap">' +
          '<button class="btn btn-primary btn-sm" onclick="App.openJob(\'' + id + '\')">' + t('view') + '</button>' +
          '<select class="input" style="width:auto;padding:6px 10px" onchange="App.setStatus(\'' + id + '\', this.value)">' +
          ['saved', 'interested', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'].map((o) =>
            '<option value="' + o + '"' + (o === st ? ' selected' : '') + '>' + esc(T_STATUS(o)) + '</option>').join('') +
          '</select></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    h += '<div class="card mt-lg"><h3>' + t('sourcesTitle') + '</h3><div class="table-wrap"><table><thead><tr><th>' + t('thSource') + '</th><th>' + t('thType') + '</th><th>' + t('thSync') + '</th><th>' + t('thImported') + '</th><th>' + t('thStatus2') + '</th></tr></thead><tbody>' +
      JOB_SOURCES.map((s) =>
        '<tr><td><b>' + esc(s.name) + '</b><br><span class="muted" style="font-size:.78rem">' + esc(s.url) + '</span></td>' +
        '<td>' + esc(s.type) + '</td><td>' + esc(s.lastSync) + '</td><td>' + s.imported + '</td>' +
        '<td><span class="badge ' + (s.active ? 'badge-green' : 'badge-gray') + '">' + (s.active ? t('active') : t('paused')) + '</span></td></tr>').join('') +
      '</tbody></table></div><p class="muted mt" style="font-size:.8rem">' + t('sourcesNote') + '</p></div>';

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
      ? (job.applyIsDirect ? t('applyBtn') : tr('applyHost', { host: hostOf(job.applyUrl) }))
      : t('applyDemo');
    const applyNote = realApply
      ? (job.applyIsDirect
          ? '<p class="mt muted" style="font-size:.8rem">' + t('noteDirect') + '</p>'
          : '<p class="mt muted" style="font-size:.8rem">' + tr('noteHosted', { host: esc(hostOf(job.applyUrl)) }) + '</p>')
      : (job.demo ? '<p class="mt"><span class="demo-strip">' + t('demoStrip') + '</span></p>' : '');
    const rows = [['Profession', 'profession'], ['Qualifications', 'qualifications'], ['Experience', 'experience'],
      ['Saudi licensing', 'licensing'], ['Skills', 'skills'], ['Location', 'location'], ['Salary', 'salary']];
    const hasSem = res.semantic !== null && res.semantic !== undefined;

    $('#modal-root').innerHTML =
      '<div class="modal-back" onclick="if(event.target===this)App.closeModal()"><div class="modal modal-lg">' +
      '<div class="flex between"><div><h3 style="margin:0">' + esc(job.title) + '</h3>' +
      '<div class="job-emp">' + esc(job.employer) + ' · ' + esc(T_CITY(job.city)) + ' · ' + esc(T_EMP(job.employment)) + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button></div>' +
      '<div class="flex mt wrap">' + ring(res.final, color) + matchBadge(res.final) +
      salaryBadge(job) +
      '<span class="badge badge-gray">' + job.expMin + '–' + job.expMax + ' ' + t('yrsExp') + '</span>' +
      '<span class="badge badge-gray">' + t('scfhsL') + ': ' + esc(pretty(job.scfhs)) + '</span>' +
      '<span class="badge badge-gray">' + t('dataflowL') + ': ' + esc(pretty(job.dataflow)) + '</span></div>' +
      (hasSem
        ? '<p class="mt" style="margin-bottom:0"><span class="badge badge-violet">AI</span> <span class="muted" style="font-size:.84rem">' +
          tr('aiBlend', { a: res.score, b: res.semantic }) + '</span></p>'
        : '') +
      '<p class="mt">' + esc(job.description) + '</p>' +
      '<h4>' + t('modBreakdown') + '</h4>' +
      rows.map((r) => bdRow(r[0], Math.round(res.breakdown[r[1]] || 0))).join('') +
      (hasSem ? bdRow('AI similarity', res.semantic) : '') +
      (res.boost ? boostRow(res.boost) : '') +
      (res.caps.length ? '<p class="mt"><span class="badge badge-red">' + t('scoreCapped') + '</span> <span class="muted">' + res.caps.map(esc).join(' · ') + '</span></p>' : '') +
      '<div class="grid grid-2 mt"><div><h4>' + t('modVsProfile') + '</h4>' + analysisList(res) + '</div>' +
      '<div><h4>' + t('modReq') + '</h4><ul class="analysis-list">' +
      (job.requirements.length ? job.requirements.map((r) => '<li><span class="mk mk-info">•</span><span>' + esc(r) + '</span></li>').join('') : '<li class="muted">' + t('modNotListed') + '</li>') +
      '</ul><h4 class="mt">' + t('modResp') + '</h4><ul class="analysis-list">' +
      (job.responsibilities.length ? job.responsibilities.map((r) => '<li><span class="mk mk-info">•</span><span>' + esc(r) + '</span></li>').join('') : '<li class="muted">' + t('modNotListed') + '</li>') +
      '</ul></div></div>' +
      '<div class="flex mt wrap">' +
      '<button class="btn btn-primary" onclick="App.applyJob(\'' + job.id + '\')">' + esc(applyLabel) + '</button>' +
      '<button class="btn btn-outline" onclick="App.coverLetter(\'' + job.id + '\')">' + t('coverLetter') + '</button>' +
      '<button class="btn btn-outline" onclick="App.interviewPrep(\'' + job.id + '\')">' + t('interviewPrep') + '</button>' +
      '<button class="btn btn-outline" onclick="App.setStatus(\'' + job.id + '\',\'interested\');App.closeModal()">' + t('markInterested') + '</button>' +
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
    if (/\.pdf$/i.test(file.name)) { readPdfFile(file); return; }
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
    try {
      const fr = new FileReader();
      fr.onload = () => cvFileSet(file.name, String(fr.result || ''));
      fr.readAsDataURL(file);
    } catch (e) { /* ignore */ }
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
          pdfStashText = text;
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
    toggleLang() {
      lang = lang === 'ar' ? 'en' : 'ar';
      try { localStorage.setItem('medmatch_lang', lang); } catch (e) { /* ignore */ }
      applyLang();
      render();
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
      if (cloudEnabled()) {
        if (mode === 'signup' && name.length < 2) return fail('Enter your name.');
        if (!sb) return fail('Sign-in service is still loading — try again in a few seconds.');
        sendMagicLink(email, mode === 'signup' ? name : '', $('.modal .btn-primary'));
        return;
      }
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
        toast('Welcome, ' + name + '!', 'ok');
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
      toast('Signed out.', 'info');
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
      } catch (e) { console.warn('cloud delete:', e); }
      try { localStorage.removeItem(accountKey(email)); } catch (e) { /* ignore */ }
      cvFileClear();
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
      const done = () => toast('Letter copied.', 'ok');
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
      const done = () => toast('Prep sheet copied.', 'ok');
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
    saveQuickFixes() {
      const v = (id) => { const el = $(id); return el ? el.value.trim() : ''; };
      const name = v('qfName'), phone = v('qfPhone');
      if (name) state.profile.fullName = name;
      if (phone) state.profile.phone = phone;
      state.profile.scfhsRegistration = v('qfScfhs');
      state.profile.dataflow = v('qfDataflow');
      save();
      render();
      toast('Saved — match scores updated.', 'ok');
    },
    toggleCvEdit(on) {
      cvEditMode = on !== false;
      if (cvEditMode) cvView = 'doc';
      render();
      if (cvEditMode) setTimeout(() => { const el = $('#cvEditor'); if (el) el.focus(); }, 50);
    },
    setCvTpl(v) {
      cvTpl = CV_TPLS[v] ? v : 'classic';
      render();
    },
    setCvView(v) {
      cvView = v === 'original' ? 'original' : 'doc';
      cvEditMode = false;
      render();
    },
    toggleCvMarks(on) {
      cvMarks = !!on;
      render();
    },
    updateCvCount(val) {
      const el = $('#cvEditCount');
      if (el) el.textContent = String(val || '').trim().split(/\s+/).filter(Boolean).length + ' words';
    },
    autoSplit(si, ii) {
      const st = structureCv(state.cvText);
      const sec = st.secs[si], item = sec && sec.items[ii];
      if (!item) return;
      const parts = splitLongItem(item);
      if (parts.length < 2) { toast('No clean split point in this one — try the AI rewrite or Edit in place.', 'info'); return; }
      const at = state.cvText.indexOf(item);
      if (at === -1) { toast('Could not locate that text — use Edit in place.', 'info'); return; }
      const next = state.cvText.slice(0, at) + parts.join('\n- ') + state.cvText.slice(at + item.length);
      try {
        applyCvText(next, 'Split into ' + parts.length + ' bullets');
      } catch (err) {
        toast('Fix failed: ' + err.message, 'err');
      }
    },
    async aiRewrite(si, ii) {
      if (aiBusy) return;
      const st = structureCv(state.cvText);
      const sec = st.secs[si], item = sec && sec.items[ii];
      if (!item) return;
      aiBusy = true;
      render();
      try {
        const r = await callAi('rewrite', item, { profession: state.profile.profession });
        aiBusy = false;
        if (r.error || !r.bullets || !r.bullets.length) {
          render();
          toast(r.error || 'AI gave nothing usable — try Split instead.', 'info');
          return;
        }
        const at = state.cvText.indexOf(item);
        if (at === -1) { render(); toast('Could not locate that text — use Edit in place.', 'info'); return; }
        const next = state.cvText.slice(0, at) + r.bullets.join('\n- ') + state.cvText.slice(at + item.length);
        applyCvText(next, 'AI rewrite applied');
      } catch (e) {
        aiBusy = false;
        render();
        toast('AI unavailable: ' + e.message, 'err');
      }
    },
    async aiImprove() {
      if (aiBusy || !state.cvText) return;
      aiBusy = true;
      render();
      try {
        const r = await callAi('improve', state.cvText.slice(0, 6000), { profession: state.profile.profession });
        aiBusy = false;
        if (r.error || !r.fixes || !r.fixes.length) {
          render();
          toast(r.error || 'AI found nothing to change — your CV is in good shape.', 'info');
          return;
        }
        aiFixes = r.fixes.filter((f) => f.find && f.replace && state.cvText.indexOf(f.find) !== -1).slice(0, 6);
        render();
        if (!aiFixes.length) toast('AI suggestions did not match your text closely enough to auto-apply — try Edit in place.', 'info');
      } catch (e) {
        aiBusy = false;
        render();
        toast('AI unavailable: ' + e.message, 'err');
      }
    },
    aiApply(i) {
      const f = aiFixes[i];
      if (!f) return;
      const at = state.cvText.indexOf(f.find);
      if (at === -1) { toast('Text changed since the suggestion — run AI again.', 'info'); return; }
      aiFixes = [];
      const next = state.cvText.slice(0, at) + f.replace + state.cvText.slice(at + f.find.length);
      try {
        applyCvText(next, 'AI fix applied');
      } catch (err) {
        toast('Fix failed: ' + err.message, 'err');
      }
    },
    aiDismiss() {
      aiFixes = [];
      render();
    },
    downloadOriginal() {
      const f = cvFileGet();
      if (!f) { toast('No original file stored for this CV.', 'info'); return; }
      const aEl = document.createElement('a');
      aEl.href = f.data;
      aEl.download = f.name || 'original-cv.pdf';
      document.body.appendChild(aEl); aEl.click(); aEl.remove();
    },
    downloadCv(kind) {
      const st = structureCv(state.cvText);
      const doc = cvDocHtml(st, false);
      const name = (state.profile.fullName || 'MedMatch-CV').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'MedMatch-CV';
      if (kind === 'txt') {
        const b = new Blob([state.cvText], { type: 'text/plain;charset=utf-8' });
        const u = URL.createObjectURL(b);
        const aEl = document.createElement('a');
        aEl.href = u; aEl.download = name + '.txt';
        document.body.appendChild(aEl); aEl.click(); aEl.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        return;
      }
      const full = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(name) + '</title><style>' +
        cvExportCss(cvTpl) + '</style></head><body>' + doc.html + '</body></html>';
      if (kind === 'pdf') {
        const w = window.open('', '_blank');
        if (!w) { toast('Popup blocked — allow popups to export PDF, or use the .html download.', 'err'); return; }
        w.document.write(full);
        w.document.close();
        w.focus();
        setTimeout(() => { try { w.print(); } catch (e) { /* ignore */ } }, 400);
        return;
      }
      const b2 = new Blob([full], { type: 'text/html;charset=utf-8' });
      const u2 = URL.createObjectURL(b2);
      const a2 = document.createElement('a');
      a2.href = u2; a2.download = name + '.html';
      document.body.appendChild(a2); a2.click(); a2.remove();
      setTimeout(() => URL.revokeObjectURL(u2), 4000);
    },
    saveCvEdit() {
      const el = $('#cvEditor');
      const text = el ? el.innerText.replace(/\u00a0/g, ' ').split('\n').map((s) => s.trim()).filter(Boolean).join('\n') : '';
      if (!text) { toast('The editor is empty — paste your CV text or cancel.', 'err'); return; }
      try {
        applyCvText(text, 'CV updated');
      } catch (err) {
        toast('Extraction failed: ' + err.message, 'err');
      }
    },
    clearActivity() {
      state.events = [];
      save();
      render();
      toast('Activity history cleared.', 'info');
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
      cvFileClear();
      aiFixes = [];
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
        if (text !== pdfStashText) cvFileClear();
        aiFixes = [];
        const _res = analyzeCv(text, state.profile);
        if (!state.atsHistory) state.atsHistory = [];
        const _prev = state.atsHistory.length ? state.atsHistory[state.atsHistory.length - 1].score : null;
        state.atsHistory.push({ t: Date.now(), score: _res.score });
        if (state.atsHistory.length > 10) state.atsHistory = state.atsHistory.slice(-10);
        embState.cvVec = null;
        embState.ready = false;
        save();
        toast('CV analyzed — ATS score ' + _res.score + (_prev === null ? '' : ' (' + (_res.score - _prev >= 0 ? '+' : '') + (_res.score - _prev) + ')') + '. Full report on the CV Analysis page.', 'ok');
        App.go('analysis');
        warmupSemantic(false);
      } catch (err) {
        toast('Extraction failed: ' + err.message, 'err');
      }
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') App.closeModal();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) App.closeMenus();
  });

  applyLang();
  render();
  initCloud();

  try { if (state.cvText) warmupSemantic(true); } catch (e) { /* never block the UI */ }
})();
