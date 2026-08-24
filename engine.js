/* MedMatch Saudi — AI engine (client-side MVP).
   Extraction is keyword/regex based for the demo. In production this module is
   replaced by an OCR + LLM extraction pipeline plus embedding-based semantic
   similarity, combined with these same structured rules (never LLM-only). */

const Engine = (() => {

  const lc = s => (s || '').toLowerCase().trim();

  function normalizeTitle(title){
    const t = lc(title).replace(/[–—]/g,'-').replace(/\s+/g,' ');
    if (TITLE_NORMALIZATION[t]) return TITLE_NORMALIZATION[t];
    for (const [k,v] of Object.entries(TITLE_NORMALIZATION)) if (t.includes(k)) return v;
    return null;
  }

  /* ---------------- CV text extraction ---------------- */

  const PROF_KEYS = [
    [/\b(general practitioner|general physician|gp doctor|\bgp\b|family medicine|family doctor|primary care physician|medical officer)\b/i,'General Practitioner'],
    [/consultant/i,'Consultant'],
    [/specialist|registrar/i,'Specialist'],
    [/dentist|dental|\bbds\b|orthodont|endodont/i,'Dentist'],
    [/nurse|nursing|\brn\b/i,'Nurse'],
    [/pharmacist|pharmacy|\bpharmd\b|\bbpharm\b/i,'Pharmacist'],
    [/physiotherap|physical therap/i,'Physiotherapist'],
    [/radiolog/i,'Radiologist'],
    [/laborator|lab technolog|medical technolog|\bmlt\b/i,'Laboratory'],
    [/healthcare admin|hospital admin|clinic manager|operations manager/i,'Healthcare Administrator']
  ];

  const DEGREE_KEYS = ['MBBS','MD','BDS','DDS','PharmD','BPharm','BSc Nursing','BSN','MSc','PhD','MRCGP','MRCP','FRCS','FCPS','MRCPI','Arab Board','Saudi Board','American Board','Fellowship','Diploma'];

  function extractFromText(text){
    const t = text || '';
    const lines = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const prov = {}; // field -> 'cv' | 'missing'
    const out = { prov };

    const set = (k,v)=>{ out[k]=v; prov[k]= v!==null && v!==undefined && v!=='' ? 'cv':'missing'; };

    // personal
    const email = (t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)||[])[0] || '';
    const phone = (t.match(/(\+?\d[\d\s\-()]{7,}\d)/)||[])[0] || '';
    let name = '';
    for (const line of lines.slice(0,4)){
      const clean = line.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s*/i,'');
      if (!/@|\d{5,}|cv|resume|curriculum/i.test(line) && /^[a-zA-Z .'-]{4,50}$/.test(clean) && clean.split(/\s+/).length>=2 && clean.split(/\s+/).length<=5){ name = line; break; }
    }
    set('fullName', name);
    set('email', email);
    set('phone', phone);
    const saudi = /saudi arabia|riyadh|jeddah|dammam|khobar|mecca|medina|ksa\b/i.test(t);
    set('currentCountry', saudi ? 'Saudi Arabia' : '');
    const cityHit = CITIES.find(c => c!=='Other' && new RegExp('\\b'+c+'\\b','i').test(t));
    set('location', cityHit || '');

    // profession & specialty
    let profession = '';
    for (const [re,p] of PROF_KEYS){ if (re.test(t)){ profession = p; break; } }
    set('profession', profession);
    const specHit = ['Cardiology','Dermatology','Internal Medicine','Pediatrics','Emergency Medicine','Orthodontics','Critical Care','General Practice','Family Medicine','Radiology','Obstetrics','Surgery','Orthopedics','ENT','Ophthalmology','Psychiatry','Anesthesia','Urology','Nephrology','Gastroenterology','Endocrinology','Pulmonology','Neurology','Oncology'].find(s=>new RegExp(s,'i').test(t));
    set('specialty', profession==='General Practitioner' && !specHit ? 'General Practice' : (specHit || ''));
    const posM = t.match(/(?:current(?:ly)?(?: position)?|position|designation)\s*[:\-]\s*(.+)/i);
    set('currentPosition', posM ? posM[1].split('\n')[0].slice(0,60) : '');

    // experience
    let years = null;
    const ym = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)].map(m=>parseInt(m[1])).filter(n=>n>0&&n<50);
    if (ym.length) years = Math.max(...ym);
    if (years===null){
      const range = [...t.matchAll(/\b(19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current|now)/gi)];
      if (range.length){
        const now = new Date().getFullYear();
        years = Math.max(...range.map(m=>{ const a=parseInt(m[0]); const b=/present|current|now/i.test(m[0])?now:parseInt(m[0].match(/[-–]\s*(\d{4})/)[1]); return Math.max(0,b-a); }));
      }
    }
    set('years', years);
    set('hospitalExp', /hospital|inpatient|ward/i.test(t) ? 'Yes':'');
    set('opdExp', /\bopd\b|outpatient|clinic|polyclinic/i.test(t) ? 'Yes':'');
    set('emergencyExp', /emergency|\ber\b|casualty|triage/i.test(t) ? 'Yes':'');
    set('icuExp', /\bicu\b|intensive care|critical care|ccu\b/i.test(t) ? 'Yes':'');
    set('surgicalExp', /surg(ery|ical)|operat/i.test(t) ? 'Yes':'');

    // education
    const education = [];
    for (const line of lines){
      const deg = DEGREE_KEYS.find(d=>new RegExp('\\b'+d.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(line));
      if (deg){
        const yr = (line.match(/\b(19|20)\d{2}\b/)||[])[0] || '';
        const uni = (line.match(/([A-Z][A-Za-z&' ]+(University|College|Institute)[A-Za-z&' ]*)/)||[])[1] || '';
        education.push({ degree:deg, university:uni, year:yr });
      }
    }
    out.education = education; prov.education = education.length ? 'cv':'missing';

    // licensing
    const lic = {};
    lic.scfhsClassification = /scfhs/i.test(t) ? (/classif/i.test(t) ? 'Yes' : (/scfhs/i.test(t)?'Yes':'')) : '';
    lic.scfhsRegistration  = /scfhs/i.test(t) && /regist/i.test(t) ? 'Yes' : (/scfhs[^.\n]{0,40}active/i.test(t) ? 'Yes' : '');
    lic.saudiLicense       = /saudi (professional )?licen[cs]e/i.test(t) ? 'Yes' : '';
    lic.dataflow           = /dataflow/i.test(t) ? (/dataflow[^.\n]{0,40}(complet|done|verif)/i.test(t) ? 'Completed' : 'In progress') : '';
    lic.prometric          = /prometric/i.test(t) ? (/prometric[^.\n]{0,40}(pass|complet|done)/i.test(t) ? 'Passed' : 'Scheduled') : '';
    lic.smle               = /\bsmle\b/i.test(t) ? 'Passed' : '';
    lic.other              = (t.match(/(HAAD|DHA|MOH UAE|QCHP|GMC|PLAB|USMLE)[^\n,]*/gi)||[]).join('; ');
    out.licensing = lic;
    prov.licensing = Object.values(lic).some(v=>v) ? 'cv':'missing';

    // work experience blocks
    const work = [];
    const dateRe = /((19|20)\d{2})\s*[-–]\s*((19|20)\d{2}|present|current|now)/i;
    for (let i=0;i<lines.length;i++){
      const line = lines[i];
      if (dateRe.test(line) && /hospital|clinic|polyclinic|center|centre|medical|pharmacy|laborator|university/i.test(line)){
        const parts = line.split(/\s*[-–—,|]\s*/);
        const title = (parts[0]||'').slice(0,60);
        const employer = (parts.find(p=>/hospital|clinic|polyclinic|center|centre|medical|pharmacy|laborator/i.test(p))||'').replace(dateRe,'').trim().slice(0,60);
        const dm = line.match(dateRe);
        const city = CITIES.find(c=>c!=='Other' && new RegExp('\\b'+c+'\\b','i').test(line)) || '';
        work.push({ title, employer, city, country:/saudi/i.test(line)?'Saudi Arabia':'', start:dm?dm[1]:'', end:dm?dm[3]:'', responsibilities:'' });
      }
    }
    out.work = work.slice(0,8); prov.work = work.length ? 'cv':'missing';

    // skills & certs
    const skills = SKILLS_VOCAB.filter(s=>new RegExp('\\b'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(t));
    out.skills = skills; prov.skills = skills.length ? 'cv':'missing';
    const certs = CERTS_VOCAB.filter(c=>new RegExp('\\b'+c+'\\b','i').test(t));
    out.certs = certs; prov.certs = certs.length ? 'cv':'missing';

    return out;
  }

  /* ---------------- profile helpers ---------------- */

  const COMPLETENESS_FIELDS = ['fullName','email','phone','nationality','currentCountry','profession','specialty','years','preferredCities','preferredSalary','employmentType','availability','scfhsClassification','scfhsRegistration','saudiLicense','dataflow','education','work','skills','noticePeriod'];

  function completeness(profile){
    let filled = 0;
    for (const f of COMPLETENESS_FIELDS){
      const v = profile[f];
      if (Array.isArray(v) ? v.length : (v!=='' && v!==null && v!==undefined)) filled++;
    }
    return Math.round(filled / COMPLETENESS_FIELDS.length * 100);
  }

  function profileStrength(profile){
    const base = completeness(profile) * 0.6;
    let lic = 0;
    if (profile.scfhsClassification==='Yes') lic += 10;
    if (profile.scfhsRegistration==='Yes') lic += 12;
    if (profile.dataflow==='Completed') lic += 8;
    if (profile.saudiLicense==='Yes') lic += 10;
    return Math.min(100, Math.round(base + lic));
  }

  /* ---------------- matching engine ---------------- */

  const RELATED = { 'Specialist':['Consultant'], 'Consultant':['Specialist'] };

  function hasSaudiExperience(profile){
    return (profile.work||[]).some(w=>/saudi/i.test(w.country||'') || CITIES.some(c=>c!=='Other'&&lc(w.city)===lc(c)));
  }

  function profileDegrees(profile){
    return (profile.education||[]).map(e=>lc(e.degree)).join(' ') + ' ' + lc(profile.degreeText||'');
  }

  function degreeMet(profile, job){
    const req = lc(job.degreeReq||'');
    if (!req) return { met:true, note:null };
    const degs = profileDegrees(profile);
    const need = [];
    if (/mbbs|medical degree|equivalent medical/.test(req)) need.push(['medical degree', /\b(mbbs|mbchb|md|doctor of medicine)\b/.test(degs)]);
    if (/bds|dental/.test(req)) need.push(['dental degree', /\b(bds|dds|dmd)\b/.test(degs)]);
    if (/bpharm|pharmd|pharmacy/.test(req)) need.push(['pharmacy degree', /\b(bpharm|pharmd)\b/.test(degs)]);
    if (/nursing/.test(req)) need.push(['nursing degree', /(nursing|bsn)/.test(degs)]);
    if (/physiotherapy|physical therapy/.test(req)) need.push(['physiotherapy degree', /physiotherap|physical therap|\bbpt\b/.test(degs)]);
    if (/laborator|medical laboratory/.test(req)) need.push(['laboratory sciences degree', /laborator|medical tech|\bmls\b/.test(degs)]);
    if (/postgraduate|fellowship|board|mrcp|md\b/.test(req) && /medicine|cardiology|dermatology|pediatrics|radiology|emergency|internal/.test(req))
      need.push(['recognized postgraduate qualification', /(mrcp|frcs|fcps|board|fellowship|mrcgp|\bmd\b|msc|phd|arab board|saudi board|american board)/.test(degs) || (profile.years||0) >= (job.expMin||0) + 2]);
    if (/healthcare management|related field/.test(req)) need.push(['relevant degree', degs.length>0]);
    if (!need.length) return { met:true, note:null };
    const failed = need.filter(([,ok])=>!ok).map(([n])=>n);
    return { met: failed.length===0, failed };
  }

  function scoreJob(profile, job, W){
    W = W || DEFAULT_WEIGHTS;
    const res = { breakdown:{}, matches:[], concerns:[], missing:[], notes:[], caps:[] };
    const certsHave = new Set([...(profile.certs||[]), ...(profile.skills||[])].map(lc));
    const skillsHave = new Set((profile.skills||[]).map(lc));

    // 1. Profession & specialty (25%)
    let prof = 0;
    const pp = lc(profile.profession);
    if (!pp){ prof = 50; res.notes.push('Profession not set in your profile — add it for accurate matching.'); }
    else if (pp === lc(job.profession)){
      prof = 100; res.matches.push(`Profession match: ${job.profession}`);
      if ((job.profession==='Specialist'||job.profession==='Consultant') && job.specialty && profile.specialty && lc(job.specialty)!==lc(profile.specialty)){
        prof = 45; res.concerns.push(`Job specialty is ${job.specialty}; your specialty is ${profile.specialty||'not set'}.`);
      } else if (job.specialty && profile.specialty && lc(job.specialty)===lc(profile.specialty)){
        res.matches.push(`Specialty match: ${job.specialty}`);
      }
    }
    else if ((RELATED[profile.profession]||[]).includes(job.profession)){ prof = 55; res.concerns.push(`Job is for a ${job.profession} rank; your profile says ${profile.profession}.`); }
    else { prof = 0; res.missing.push(`Required profession: ${job.profession} (your profile: ${profile.profession}).`); }
    res.breakdown.profession = prof;

    // 2. Mandatory qualifications (20%)
    let qual = 100;
    const deg = degreeMet(profile, job);
    if (!deg.met){ qual -= 60; (deg.failed||[]).forEach(f=>res.missing.push(`Required qualification not found in your profile: ${f}.`)); }
    else if (job.degreeReq) res.matches.push('Required degree: met');
    const missingCerts = (job.certs||[]).filter(c=>!certsHave.has(lc(c)));
    if (missingCerts.length){
      qual -= missingCerts.length * 20;
      missingCerts.forEach(c=>res.missing.push(`${c} certification not found in your CV.`));
    }
    (job.certs||[]).filter(c=>certsHave.has(lc(c))).forEach(c=>res.matches.push(`${c} certified`));
    res.breakdown.qualifications = Math.max(0, qual);

    // 3. Experience (20%)
    let exp;
    const yrs = profile.years;
    if (yrs===null || yrs===undefined || yrs===''){ exp = 50; res.notes.push('Years of experience not set in your profile.'); }
    else if (yrs >= job.expMax) { exp = 100; res.matches.push(`${yrs} years experience meets the ${job.expMin}–${job.expMax} year requirement`); }
    else if (yrs >= job.expMin) { exp = 82 + Math.min(18, (yrs - job.expMin) * 6); res.matches.push(`${yrs} years experience meets the minimum (${job.expMin}+ years)`); }
    else { exp = Math.round(Math.max(10, (yrs / Math.max(1,job.expMin)) * 60)); res.concerns.push(`Job asks for ${job.expMin}+ years; your profile shows ${yrs}.`); }
    res.breakdown.experience = Math.round(exp);

    // 4. Saudi licensing & eligibility (15%)
    let licChecks = [], licMet = 0;
    if (job.scfhs === 'required'){
      licChecks.push('scfhs');
      if (profile.scfhsRegistration==='Yes'){ licMet++; res.matches.push('SCFHS registration: active'); }
      else if (profile.scfhsClassification==='Yes'){ res.concerns.push('SCFHS classification found, but active registration is required for this job.'); }
      else res.missing.push('SCFHS registration is required and was not found in your profile.');
    } else if (job.scfhs === 'preferred'){
      licChecks.push('scfhs-pref');
      if (profile.scfhsRegistration==='Yes' || profile.scfhsClassification==='Yes'){ licMet++; res.matches.push('SCFHS status: present (preferred)'); }
      else res.concerns.push('SCFHS status preferred but not found in your profile.');
    } else res.notes.push('SCFHS requirement not specified in the job posting.');

    if (job.dataflow === 'required'){
      licChecks.push('dataflow');
      if (profile.dataflow==='Completed'){ licMet++; res.matches.push('DataFlow verification: completed'); }
      else if (profile.dataflow){ res.concerns.push(`DataFlow status: ${profile.dataflow} (job requires completed verification).`); }
      else res.missing.push('DataFlow verification is required and not recorded in your profile.');
    } else if (job.dataflow === 'not_specified') res.notes.push('DataFlow requirement not specified in the job posting.');

    if (job.saudiExp === 'required'){
      licChecks.push('saudiexp');
      if (hasSaudiExperience(profile)){ licMet++; res.matches.push('Saudi work experience: present'); }
      else res.missing.push('This employer requires previous Saudi Arabia work experience.');
    } else if (job.saudiExp === 'preferred'){
      licChecks.push('saudiexp-pref');
      if (hasSaudiExperience(profile)){ licMet++; res.matches.push('Saudi work experience: present (preferred)'); }
      else res.concerns.push('Employer prefers candidates with Saudi experience.');
    }
    res.breakdown.licensing = licChecks.length ? Math.round(licMet/licChecks.length*100) : 100;

    // 5. Skills (10%)
    let skills = 100;
    if ((job.skills||[]).length){
      const hit = job.skills.filter(s=>skillsHave.has(lc(s)));
      skills = Math.round(hit.length / job.skills.length * 100);
      hit.slice(0,4).forEach(s=>res.matches.push(`Skill: ${s}`));
      const miss = job.skills.filter(s=>!skillsHave.has(lc(s)));
      if (miss.length && skills < 60) res.concerns.push(`Skills not evidenced in your CV: ${miss.slice(0,3).join(', ')}.`);
    } else res.notes.push('No specific skill keywords listed in the job posting.');
    res.breakdown.skills = skills;

    // 6. Location preference (5%)
    let loc;
    const prefs = profile.preferredCities||[];
    if (!prefs.length){ loc = 80; res.notes.push('No preferred cities set — location scored neutral.'); }
    else if (prefs.map(lc).includes(lc(job.city))){ loc = 100; res.matches.push(`Location matches your preference: ${job.city}`); }
    else { loc = 40; res.concerns.push(`${job.city} is outside your preferred cities.`); }
    res.breakdown.location = loc;

    // 7. Salary preference (5%)
    let sal;
    const want = parseFloat(profile.preferredSalary);
    if (!want){ sal = 80; }
    else if (!job.salaryMax){ sal = 70; res.notes.push('Salary not stated in the job posting.'); }
    else if (job.salaryMax >= want){ sal = 100; res.matches.push(`Salary range meets your expectation (SAR ${fmtNum(job.salaryMin)}–${fmtNum(job.salaryMax)})`); }
    else { sal = Math.max(20, Math.round(job.salaryMax / want * 100)); res.concerns.push(`Advertised maximum (SAR ${fmtNum(job.salaryMax)}) is below your expected SAR ${fmtNum(want)}.`); }
    res.breakdown.salary = sal;

    // weighted total
    let total =
      res.breakdown.profession     * W.profession     / 100 +
      res.breakdown.qualifications * W.qualifications / 100 +
      res.breakdown.experience     * W.experience     / 100 +
      res.breakdown.licensing      * W.licensing      / 100 +
      res.breakdown.skills         * W.skills         / 100 +
      res.breakdown.location       * W.location       / 100 +
      res.breakdown.salary         * W.salary         / 100;

    // hard-requirement gates (mandatory failures cap the score)
    if (res.breakdown.profession === 0){ total = Math.min(total, 30); res.caps.push('Profession mismatch'); }
    if (!deg.met){ total = Math.min(total, 45); res.caps.push('Required degree not met'); }
    if (job.scfhs==='required' && profile.scfhsRegistration!=='Yes'){ total = Math.min(total, 55); res.caps.push('SCFHS registration required'); }
    if (job.saudiExp==='required' && !hasSaudiExperience(profile)){ total = Math.min(total, 60); res.caps.push('Saudi experience required'); }
    if (yrs!==null && yrs!==undefined && yrs!=='' && yrs < job.expMin){ total = Math.min(total, 72); res.caps.push('Below minimum experience'); }

    res.score = Math.max(0, Math.min(100, Math.round(total)));
    return res;
  }

  function fmtNum(n){ return (n??0).toLocaleString('en-US'); }

  function matchLabel(score){
    if (score>=90) return ['Excellent match','green'];
    if (score>=80) return ['Strong match','teal'];
    if (score>=70) return ['Good match','blue'];
    if (score>=50) return ['Partial match','amber'];
    return ['Low match','gray'];
  }

  /* ---------------- natural-language search ---------------- */

  function parseNLQuery(q){
    const t = lc(q||'');
    const f = { profession:'', city:'', minSalary:null, minScore:null, saudiExpOk:false, employment:'', useProfile:false, raw:q };
    if (/suitable for (my cv|me)|for my cv|my profile|match me|best match/.test(t)) f.useProfile = true;
    for (const [re,p] of PROF_KEYS){ if (re.test(t)){ f.profession = p; break; } }
    if (/\bconsultant\b/.test(t)) f.profession = 'Consultant';
    if (/\bspecialist\b/.test(t)) f.profession = 'Specialist';
    const city = CITIES.find(c=>c!=='Other' && new RegExp('\\b'+lc(c)+'\\b').test(t));
    if (city) f.city = city;
    const sal = t.match(/(?:at least|minimum|min|>=?|above|over|from)\s*(?:sar\s*)?([\d,]{4,})/) || t.match(/([\d,]{4,})\s*(?:sar|sr)\b/);
    if (sal) f.minSalary = parseInt(sal[1].replace(/,/g,''));
    if (/without saudi experience|no saudi experience|accept(s|ing)? candidates without/.test(t)) f.saudiExpOk = true;
    const sc = t.match(/(?:match|score)\s*(?:above|over|>=?|of)\s*(\d{2,3})\s*%?/);
    if (sc) f.minScore = parseInt(sc[1]);
    const emp = EMPLOYMENT_TYPES.find(e=>new RegExp(lc(e),'i').test(t));
    if (emp) f.employment = emp;
    return f;
  }

  /* ---------------- CV improvement ---------------- */

  function improvementTips(profile, cvText){
    const tips = [];
    const t = cvText || '';
    const push = (sev, title, detail)=>tips.push({sev, title, detail});

    if (profile.scfhsClassification!=='Yes') push('high','Add SCFHS classification status','Saudi employers filter on SCFHS classification. If you have it, state the decision number and date clearly in a "Licensing" section.');
    if (profile.scfhsRegistration!=='Yes') push('high','Add SCFHS registration status','If registered, include your SCFHS registration number and expiry. If in progress, say so explicitly.');
    if (!profile.dataflow) push('high','Add DataFlow verification status','Primary-source verification (DataFlow) is a standard Saudi hiring step. Add its status to avoid delays.');
    if (!(profile.certs||[]).includes('BLS') && ['General Practitioner','Nurse','Specialist','Consultant'].includes(profile.profession)) push('high','Add BLS certification','BLS is expected for most clinical roles in Saudi Arabia. If certified, list it with expiry date.');
    if (!(profile.certs||[]).includes('ACLS') && ['General Practitioner','Nurse'].includes(profile.profession)) push('medium','Consider ACLS certification','Many GP/ER and nursing postings list ACLS as required or preferred. Only add it if you genuinely hold it.');
    if ((profile.skills||[]).length < 5) push('medium','Expand your skills section','List concrete clinical skills (e.g., OPD, triage, chronic disease management). Job matching relies heavily on these keywords.');
    if (!/\d+\s*(%|patients|cases|procedures)/i.test(t)) push('medium','Quantify your achievements','Add measurable outcomes, e.g. "managed 40+ OPD patients/day" or "reduced waiting time by 20%". Numbers make experience credible.');
    if (!/licen[cs]ing|licen[cs]e/i.test(t)) push('medium','Create a dedicated Licensing section','Group SCFHS, DataFlow, Prometric/SMLE and other licenses in one clearly-labelled section near the top.');
    if (!profile.phone) push('medium','Add a phone number','Recruiters in Saudi Arabia commonly contact candidates by phone/WhatsApp. Include country code.');
    if (!(profile.work||[]).length) push('high','Structure your work history','For each role include employer, city, country, dates (MM/YYYY), and 3–5 bullet responsibilities.');
    if (!/•|\-|\*/.test(t)) push('low','Use bullet points','Bulleted responsibilities scan better than paragraphs for both recruiters and AI parsing.');
    if (t && t.length < 900) push('low','CV appears very short','Aim for 1–2 pages covering education, licensing, experience and skills.');
    if (!profile.nationality) push('low','Add nationality','Often requested for Saudi visa/Iqama processing; include it in your profile.');
    if (!tips.length) push('ok','Your CV looks strong','No major gaps detected for Saudi healthcare applications. Keep licensing dates current.');
    return tips;
  }

  return { normalizeTitle, extractFromText, completeness, profileStrength, scoreJob, matchLabel, parseNLQuery, improvementTips, hasSaudiExperience, fmtNum };
})();
