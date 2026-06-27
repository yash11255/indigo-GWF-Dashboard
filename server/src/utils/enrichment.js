/**
 * Automatic data enrichment pipeline
 * Runs on server start — no manual intervention needed.
 *
 * Stages (in order):
 *  1. Deduplication   — remove records where same person appears in both draft + applied
 *  2. Deterministic   — district→state lookup, name→gender lookup (no AI, instant)
 *  3. AI enrichment   — employmentStatus / remaining state gaps (background, async)
 */

const { loadFills, saveFills } = require('./aiFills');
const Groq  = require('groq-sdk');
const path  = require('path');

// ─── Status (in-memory, reset each server start) ─────────────────────────────
const status = {
  running:     false,
  stage:       'idle',           // idle | dedup | deterministic | ai | done
  filled:      0,
  total:       0,
  deduped:     0,
  deterministic: 0,
  completedAt: null,
  log:         [],
};
function getStatus() { return { ...status }; }
function log(msg) { console.log('  [Enrich]', msg); status.log = [...status.log.slice(-19), msg]; }

// ─── Indian name → gender lookup ─────────────────────────────────────────────
const FEMALE_NAMES = new Set([
  'aakanksha','aakruthi','aaradhya','aarti','abha','abhilasha','aditi','ahana',
  'aishwarya','akanksha','akshara','alka','amisha','amita','amrita','amruta',
  'ananya','ancy','anjali','anjana','ankita','annapurna','anshika','anuja','anupriya',
  'anuradha','anushka','anushri','apeksha','archana','archi','arshiya','asha',
  'ashwini','asmita','astha','avani','ayushi','bhavana','bhavna','bhumi','bhumika',
  'chandni','charu','charutha','charishma','chhavi','damini','deepa','deepika',
  'deepthi','devanshi','devika','dhara','disha','divya','diya','durga','ekta',
  'esha','falguni','garima','gauri','gayatri','geeta','geetanjali','gitanjali',
  'gunjan','hansa','hansika','harini','harshita','harshitha','hema','hemalatha',
  'hemlata','himani','hinal','hira','isha','ishika','ishita','janhavi','jahnvi',
  'jasmine','jayashree','jhanvi','jyoti','jyotsna','kajal','kalpana','kalyani',
  'kamala','kamini','kanchan','kavitha','kavya','khushi','komal','kratika',
  'kritika','krupa','kumkum','lakshmi','latha','lavanya','laxmi','leena','leha',
  'madhuri','mahima','mala','mamta','manasi','manavi','manisha','mansi','meena',
  'meera','megha','minal','mitali','monika','mrunali','mythili','nandini','neelam',
  'neha','nidhi','nikita','nisha','nithya','nivedita','nupura','paavani','pallavi',
  'parvati','pavni','piya','pooja','poonam','pragya','pranali','pranjal','prarthana',
  'preethi','preety','prerana','priya','priyanka','purvi','radha','radhika','rashmi',
  'rekha','renu','riddhi','ridhima','riti','ritika','riya','rohini','ruhi','rupali',
  'ruta','sakshi','saloni','sandhya','sangeetha','sanjana','sanskriti','sapna',
  'sarika','saswati','savita','seema','shakuntala','shikha','shilpa','shivani',
  'shradhha','shradha','shraddha','shreya','shruti','shubhangi','shweta','simran',
  'smita','sneha','sonal','sonam','sonali','soumya','sri','sridevi','srividya',
  'sruthi','sudha','sujatha','sujata','sunita','swapna','swara','swati','tanisha',
  'tanvi','tanya','taruna','tejal','thenmozhi','trishna','tulsi','usha','utkarsha',
  'vandana','varsha','vasudha','veena','vibha','vidya','vijaya','vimala','vinitha',
  'vineeta','vrinda','yashika','yogita','zoya',
  // additional common ones
  'aanya','aarna','aayana','aayushi','abinaya','abirami','agalya','agatha',
  'alaknanda','alisha','alka','amala','amaya','ambika','amitha','amogha','amulya',
  'anagha','anamika','ananya','andal','anila','anindita','anisha','anita',
  'annalakshmi','annpurna','antara','anushya','aparna','arathy','archita','arti',
  'arundhati','ashika','ashima','ashmita','athmika','babita','balambiga','banupriya',
  'barnali','bhagya','bhagyalakshmi','bharathi','bharti','bhoomi','bindu','blessy',
  'chaitra','champa','chandana','chandrika','charu','charulatha','chetana',
  'chitra','chithra','daivi','dakshayini','dayana','deena','deepthi','delphina',
  'devi','devyani','dhivya','dhanya','dhriti','diksha','dimple','dipali','dipika',
  'draupadi','drisana','earnest','elavarasi','elsi','fiona','ganga','gangotri',
  'geetha','geetika','girija','girisha','gopa','gopika','greeshma','gunja',
  'harsharani','hemali','hemavathi','hemkanta','himanshi','hina','hiranya',
  'indira','indrani','indumathi','indu','ishana','ishwarya','janani','jasna',
  'jayanthi','jayanti','jayita','jessy','jitha','jithya','kaavya','kalinda',
  'kalpitha','kamakshi','kanika','kanya','karthika','kasthuri','kavitha','keertana',
  'keerthana','keerthika','ketki','kiran','kirthana','kousalya','kriti','krishna',
  'krishnaveni','kumari','kunjal','kusuma','lalita','lata','latika','leena',
  'lekha','lekshmi','lena','lilavathi','lipika','litika','lohitha','loukya',
  'madhava','madhumitha','madhupriya','madura','maheshwari','mala','malavika',
  'malini','mallika','malvika','mangala','manogna','manokamini','manonmani',
  'meenal','mihika','mili','miloni','mira','miraa','mithra','mithila','mohana',
  'monali','mounika','muktha','nalini','namitha','namrata','nandhini','nargis',
  'natasha','navaneeta','navitha','navya','neeraja','neethika','nidhisha','nilavathi',
  'nimisha','nina','nirupama','nirupama','nishitha','nithyashree','nivedha',
  'padmaja','padmavathi','padmini','pakhi','pankaja','pankhi','para','parimala',
  'parinitha','parisa','parnika','parveen','pavani','pavithra','poojakumari',
  'prabhavathi','prachi','pragathi','prajakta','prajkta','prakriti','pramodha',
  'prasanna','prathima','prathyusha','pratima','preethi','premila','prithika',
  'priyadarshini','priyadharsini','priyadharshini','priyamvada','priyatha',
  'priyatharshni','pushpa','pushpalatha','rachana','radhamma','radhna','rajalakshmi',
  'rajani','rajitha','raksha','ramya','ranjani','ranjitha','ranjithaa','rathna',
  'ratna','ratnabali','ratnakumari','renuga','revathi','revathy','rohitha',
  'roopa','roshni','rosy','rupal','rupam','ruthika','sabari','sadhana','sahana',
  'saiyeda','sajitha','sarada','saraswathi','saraswati','saritha','sathya',
  'sathyapriya','satya','saumya','shalini','shanthala','shanthi','shenaz',
  'shobha','shobhana','shruthi','sidhika','sindhu','sindhuja','sithara',
  'sivakami','sivapriya','somasheela','soundarya','sowndarya','spandana',
  'sravani','sravanthi','sreelakshmi','srilakshmi','srividhya','sruthi',
  'subashini','subha','subhashini','sudharshini','suhasini','sulochana','sumathy',
  'sumitra','supriya','surabhi','surekha','sushila','sushmita','swathi',
  'swetha','tamanna','tamilarasi','tamilselvi','tapaswini','tejasri','tejovathi',
  'thankamani','thilakavathi','thirumathi','trishala','triveni','umamaheswari',
  'umarani','umavathi','ushadevi','vaishnavi','vaishno','vallari','valliammai',
  'vasantha','vasanthakumari','veni','venkathalakshmi','vijayalakshmi','vilasini',
  'visalakshi','yachana','yamuna','yashoda','yashashwini',
]);

const MALE_NAMES = new Set([
  'aarav','aashish','abhijit','abhijith','abhimanyu','abhinav','abhishek',
  'adarsh','aditya','ajay','ajit','ajith','akash','akhil','akshay','alok',
  'amarnath','ambareesh','amit','amitabh','amol','amruth','amulya','anand',
  'aniket','anil','animesh','anirudh','anirudha','anish','ankit','ankur',
  'anmol','anoop','anshul','anuj','anup','arjun','arnav','arnav','arohi',
  'arun','aryan','ashis','ashish','ashok','ashvin','ashwin','ashwinkumar',
  'asif','atul','avinash','ayush','azhar','balaji','balasubramaniam',
  'balasubramaniyam','balram','bharath','bhaskar','bhavesh','bhupendra',
  'biplab','birajesh','brahmanand','chandan','chandrashekhar','chirag',
  'chittaranjan','danish','darshan','deepak','deven','devendra','devensh',
  'dhananjay','dhanush','dharmendra','dhruv','dinesh','dipen','dipesh',
  'divakar','divyanshu','durgesh','gagan','ganesh','gaurav','girish',
  'gopal','govind','guddu','gunjan','gurmeet','gurpreet','hamid','haresh',
  'hari','haridas','harikishan','harish','harjinder','harnoor','harsh',
  'harshit','harshvardhan','hemant','himanshu','hitesh','inder','inderjit',
  'ishaan','ishan','ishwar','jagannath','jagdish','jagmohan','jagtar',
  'jai','jaidev','jaideep','jainendra','jairambhai','jaspal','jasraj',
  'jaswant','jatin','jayant','jayesh','jaypal','jayram','jeetendra',
  'jitendra','joshil','jugal','kailash','kamal','kamlesh','karan','kartik',
  'karthik','karthikeyan','kashyap','keshav','kinshuk','kishore','koushik',
  'krishna','krishnamurthy','krishnakumar','kuldeep','kulwant','kumar',
  'lalit','lokesh','mahesh','manav','manish','manjunath','manoj','mayank',
  'mihir','mitesh','mohak','mohan','mohit','mridul','mukesh','mukund',
  'munish','murali','murthy','nandan','narayan','narender','naresh',
  'naveen','neeraj','nikhil','nilesh','niranjan','nishant','nitesh',
  'nitin','nitish','om','omkar','pankaj','parth','pavan','pavandeep',
  'piyush','pradeep','pranav','prashant','pratap','prateek','pratik',
  'praveen','pravesh','prem','puneet','pushpak','rahul','raj','rajeev',
  'rajesh','rajkumar','rajnish','rajveer','rakesh','ram','raman','ramesh',
  'ranveer','ravi','ravikumar','ravindra','ritesh','rohit','roshan',
  'rudra','sachin','sahil','sandeep','sanjay','sanjeet','sanjit','sanket',
  'santhosh','santosh','saurabh','shiv','shivam','shivkumar','shivprasad',
  'shubham','shyam','siddharth','sidharth','soham','soumit','subhash',
  'sudarshan','sudhir','suhas','sujan','sukhbir','sunil','suraj','suresh',
  'surya','suryaprakash','suryanarayana','suyash','swaroop','tarun','trilok',
  'tushar','uday','ujjwal','umesh','utkarsh','vaibhav','varun','vasanth',
  'vikas','vikram','vinayak','vinod','vipin','vipul','vishal','vishnu',
  'vishnuprasad','vivek','yash','yogesh','yuvraj','zubair',
  // south indian male names
  'aakash','aathan','abijith','abinav','adheesh','adhithya','adhiyaman',
  'adityan','afsal','ajmal','akhilesh','akilan','akilesh','akshay',
  'alaric','albin','alby','alfin','algy','alhad','alwin','anandhan',
  'andal','anish','anjaneyalu','antony','anuroop','aravind','archith',
  'arichandran','arindam','arjunan','arockia','arthy','arun','arunachalam',
  'arunkumar','arunprasad','arunselvam','arvind','asher','aswin','athul',
  'athulya','balakrishna','balamurugan','balasubramanian','balram',
  'barath','baskaran','bennet','benny','biju','bipin','boopathi','boopalan',
  'bose','chakravarthy','chandrakant','chandran','chandrasekar','chiranjeevi',
  'damodar','daniel','darvin','dasan','deeraj','deepesh','deiva','deva',
  'devapriya','dhanasekar','dhanesh','dhilip','dhilipkumar','dhinesh',
  'dhinakaran','durai','elangovan','esakki','esakkimuthu','gajendra',
  'ganeshkumar','gokul','gopalsamy','gopinath','guhanathan','harikrishna',
  'harikumar','harinarayan','hariom','harish','haroon','immanuel','jacinthraj',
  'jagan','jagannathan','jaswanth','joel','john','johnson','kalaichelvan',
  'kalaimani','kalaivanan','kalaivannan','kalidasan','kalimuthu','kalyan',
  'kalyankumar','kamalanathan','kamalaraj','kanagasundaram','kannan',
  'karthigaivel','karthikesan','kathiresan','kavin','keerthikumar',
  'kesavan','kirubakaran','koushigan','krishnamoorthy','krishnamoorthi',
  'kumaran','kumaravel','kumaravelan','kumarasamy','lakshmanan','lakshmikant',
  'lingeswaran','logesh','logeshwaran','manikandan','manikandaraj',
  'manivannnan','maran','marimuthu','mathavan','mathan','meeran','mehul',
  'mohanraj','mugundan','muniasamy','muniswaran','muralidhar','muralidharan',
  'murugan','murugesh','murugavel','muthu','muthukumar','muthuraja',
  'muthusamy','narayanan','nataraj','navaraj','navneeth','nijesh','nitin',
  'palani','palanisamy','pandian','pandiarajan','pandi','paneerselvam',
  'parimalan','parivallal','prabakaran','prabhakaran','prabhu','prabu',
  'prakash','prasanth','prathap','prathapkumar','raghavan','raghavendra',
  'raghunath','raghunathan','ragu','ragul','rajagopalan','rajamani',
  'rajamohan','rajaramesh','rajasekaran','rajendran','raju','rakesh',
  'ramachandran','ramalingam','ramesh','ramkumar','ramsankar','ramya',
  'ranjith','ranjithkumar','ranjithraj','rasigan','ravichandran',
  'ravikant','ravishankar','rijil','rishikesh','roshan','sailesh',
  'sakthivel','sakthi','salankaraj','santhoshkumar','saravanan','saravana',
  'sasikumar','sasikaran','sathishkumar','sathiyamoorthy','selvakumar',
  'selvan','selvendiran','selvaraj','selvaraghavan','senthil','senthilkumar',
  'seshan','shankar','shankaran','shanmugam','sharieff','shriram',
  'siddharthan','siva','sivakumar','sivasankar','solaimalai','somasundaram',
  'sounderrajan','sridharan','srikanth','srikumar','srinidhikumar',
  'srinivasan','sriram','subramani','subramaniam','sudhan','sudhanshu',
  'sughash','sugumar','sundar','sundaram','sundarapandian','sundareswaran',
  'sureshraja','suriyanarayanan','susaikumar','thangamuthu','thangavelmurugan',
  'tharani','thirumal','thirumalai','thirumurugan','thirunavukkarasu',
  'thiruvengadam','thoufeeq','udayakumar','udhayakumar','vairamuthu',
  'vaithiyanathan','vanitha','vedavyas','veerasamy','velayudham','velmurugan',
  'venkat','venkatachalam','venkataraman','venkatesh','venkatraman',
  'venugopal','vijay','vijayakumar','vijayakumaran','vijayarangan',
  'vijayaraj','vijayendran','vikneswaran','viknesh','vimal','vimalkumar',
  'vinoth','vinothkumar','viswanath','viswanathan','yugendran',
]);

// ─── District → State (self-bootstrapped + hardcoded fallback) ───────────────
// Built from records that already have both fields set
let _districtStateMap = null;

function buildDistrictStateMap(allRecords) {
  const map = {};
  allRecords.forEach(r => {
    const d = (r.currentDistrict || '').toUpperCase().trim();
    const s = (r.currentState || '').trim();
    if (d && d !== '-' && d !== 'NOT SPECIFIED' && d !== 'UNKNOWN'
        && s && s !== 'Not Specified' && s !== '-') {
      map[d] = s;
    }
  });
  _districtStateMap = map;
  log(`District→State map: ${Object.keys(map).length} entries`);
  return map;
}

// ─── Derive gender from first name ───────────────────────────────────────────
function inferGender(name) {
  if (!name || name === '-') return null;
  const first = name.trim().split(/\s+/)[0].toLowerCase();
  if (FEMALE_NAMES.has(first)) return 'Female';
  if (MALE_NAMES.has(first)) return 'Male';
  return null;
}

// ─── Stage 1: Deduplication ───────────────────────────────────────────────────
// If same email appears in both draft and applied → keep only the Complete version.
// Also remove duplicate applicationIds within the same source.
function deduplicateCombined(draftRows, appliedRows) {
  // Deduplicate within each source by applicationId (keep first)
  const dedupeById = (arr) => {
    const seen = new Set();
    return arr.filter(r => { if (seen.has(r.applicationId)) return false; seen.add(r.applicationId); return true; });
  };
  const cleanApplied = dedupeById(appliedRows);
  const cleanDrafts  = dedupeById(draftRows);

  // Remove drafts where the same email has a complete application
  const completedEmails = new Set(
    cleanApplied.filter(r => r.email && r.email !== '-' && r.email.includes('@')).map(r => r.email)
  );
  const dedupedDrafts = cleanDrafts.filter(d =>
    !d.email || d.email === '-' || !d.email.includes('@') || !completedEmails.has(d.email)
  );

  const removed = cleanDrafts.length - dedupedDrafts.length;
  if (removed > 0) log(`Deduplication: removed ${removed} draft records (person already has complete application)`);

  return { rows: [...dedupedDrafts, ...cleanApplied], deduped: removed };
}

// ─── Stage 2: Deterministic enrichment ────────────────────────────────────────
function deterministicEnrich(records, districtMap) {
  let genderFilled = 0, stateFilled = 0;
  const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';

  const enriched = records.map(r => {
    const patched = { ...r };

    // Gender from name
    if (isEmpty(patched.gender) || !['Male','Female','Other'].includes(patched.gender)) {
      const g = inferGender(patched.name);
      if (g) { patched.gender = g; patched._genderInferred = true; genderFilled++; }
    }

    // State from district lookup
    if (isEmpty(patched.currentState)) {
      const dKey = (patched.currentDistrict || '').toUpperCase().trim();
      const found = districtMap[dKey];
      if (found) { patched.currentState = found; patched._stateInferred = true; stateFilled++; }
    }

    return patched;
  });

  if (genderFilled) log(`Deterministic: gender filled for ${genderFilled} records (name lookup)`);
  if (stateFilled)  log(`Deterministic: state filled for ${stateFilled} records (district lookup)`);
  return { enriched, genderFilled, stateFilled };
}

// ─── Stage 3: AI enrichment (background, persisted to ai_fills.json) ─────────
const BATCH      = 10;   // smaller batch = less likely to exceed token limits
const BATCH_DELAY = 4500; // ms between batches — 13 req/min max, leaves headroom for interactive AI

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseGroqJSON(raw) {
  // Try bare array first
  let m = raw.match(/\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* fall through */ }
  }
  // Markdown code block
  m = raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (m) {
    try { return JSON.parse(m[1]); } catch { /* fall through */ }
  }
  return null;
}

async function runAIEnrich(records) {
  if (!process.env.GROQ_API_KEY) { log('No GROQ_API_KEY — skipping AI enrichment'); return; }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';
  const hasName = r => r.name && r.name !== '-' && r.name !== '- -' && r.name.trim().length > 3;

  const fills       = loadFills();
  const processedIds = new Set(Object.keys(fills).filter(k => k.endsWith('_emp')));

  const empCandidates = records.filter(r =>
    hasName(r) &&
    !processedIds.has(r.applicationId + '_emp') &&
    (isEmpty(r.employmentStatus) || !['Student','Employed','Unemployed'].includes(r.employmentStatus))
  );

  status.total = empCandidates.length;
  log(`AI enrichment: ${empCandidates.length} records need employmentStatus`);
  if (!empCandidates.length) { log('AI enrichment: nothing to fill'); return 0; }

  let filled = 0;
  const totalBatches = Math.ceil(empCandidates.length / BATCH);

  for (let i = 0; i < empCandidates.length; i += BATCH) {
    if (!status.running) break;

    const batchNum  = Math.floor(i / BATCH) + 1;
    const batch     = empCandidates.slice(i, i + BATCH);
    const batchData = batch.map(r => ({
      applicationId: r.applicationId,
      name: r.name,
      dob: r.dateOfBirth || '',
      state: r.currentState || '',
      appType: r.applicationType,
    }));

    const prompt = `You are filling missing employmentStatus for scholarship applicants.
Values: Student, Employed, Unemployed
Hint: dob age < 24 → Student; else infer from name/state.
Return ONLY a JSON array, nothing else:
[{"applicationId":"SB-2026-xxxx","value":"Student","confidence":"high"}]

Records:
${JSON.stringify(batchData)}`;

    let retries = 2;
    while (retries > 0) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 350,
          temperature: 0.05,
        });

        const raw      = completion.choices[0].message.content.trim();
        const inferred = parseGroqJSON(raw);

        if (!inferred) {
          log(`Batch ${batchNum}/${totalBatches}: unparseable response (${raw.slice(0,60)}...)`);
          break;
        }

        for (const item of inferred) {
          const val = item.value || item.employmentStatus;
          if (!item.applicationId || !val) continue;
          if (!['Student','Employed','Unemployed'].includes(val)) continue;

          if (!fills[item.applicationId]) fills[item.applicationId] = {};
          fills[item.applicationId].employmentStatus        = val;
          fills[item.applicationId]._meta = {
            ...(fills[item.applicationId]._meta || {}),
            employmentStatus_confidence: item.confidence || 'medium',
            employmentStatus_filledAt:   new Date().toISOString(),
            source: 'auto',
          };
          fills[item.applicationId + '_emp'] = { processed: true };
          filled++;
        }

        saveFills(fills);
        status.filled = filled;
        log(`Batch ${batchNum}/${totalBatches}: +${inferred.length} filled (total ${filled})`);
        break; // success — exit retry loop

      } catch (err) {
        retries--;
        const msg = err.message || String(err);
        log(`Batch ${batchNum} error: ${msg.slice(0, 80)}`);
        if (msg.includes('rate') || msg.includes('429')) {
          log('Rate limit hit — waiting 15s…');
          await sleep(15000);
        } else {
          await sleep(2000);
        }
      }
    }

    // Pace between batches to stay under rate limit
    await sleep(BATCH_DELAY);
  }

  log(`AI enrichment complete: ${filled}/${empCandidates.length} employmentStatus values filled`);
  return filled;
}

// ─── Main auto-enrichment entry point ─────────────────────────────────────────
// Called once at server startup (non-blocking).
function startAutoEnrich(getCache) {
  if (status.running) return;
  status.running     = true;
  status.stage       = 'starting';
  status.filled      = 0;
  status.completedAt = null;

  // Run async so server starts immediately
  (async () => {
    try {
      const { drafts, applied } = getCache();

      // Build district→state map from all known records
      status.stage = 'deterministic';
      const allRaw = [...drafts, ...applied];
      const distMap = buildDistrictStateMap(allRaw);

      // Deterministic gender fill — save directly to ai_fills.json
      const fills = loadFills();
      let gCount = 0;
      allRaw.forEach(r => {
        const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';
        if (isEmpty(r.gender) || !['Male','Female','Other'].includes(r.gender)) {
          const g = inferGender(r.name);
          if (g) {
            if (!fills[r.applicationId]) fills[r.applicationId] = {};
            if (!fills[r.applicationId].gender) {
              fills[r.applicationId].gender = g;
              fills[r.applicationId]._meta = {
                ...(fills[r.applicationId]._meta || {}),
                gender_confidence: 'high',
                gender_source: 'name_lookup',
              };
              gCount++;
            }
          }
        }
      });
      if (gCount) { saveFills(fills); log(`Deterministic: ${gCount} gender values saved`); }
      status.deterministic = gCount;

      // AI enrichment in background
      status.stage = 'ai';
      // Build combined for AI enrichment context
      const { applyFills } = require('./aiFills');
      const combined = applyFills([
        ...drafts.map(d => ({ ...d, applicationType: 'Draft' })),
        ...applied.map(a => ({ ...a, applicationType: 'Complete' })),
      ]);
      await runAIEnrich(combined);

    } catch (err) {
      log(`Auto-enrich error: ${err.message}`);
    } finally {
      status.running     = false;
      status.stage       = 'done';
      status.completedAt = new Date().toISOString();
      log(`Auto-enrichment pipeline complete`);
    }
  })();
}

module.exports = { startAutoEnrich, deduplicateCombined, deterministicEnrich, buildDistrictStateMap, getStatus };
