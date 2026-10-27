/* Tracking scores.
   Each score lists its questions and how to add them up.
   To edit wording, change the text in quotes. To add a score, copy one block and change it.
   "for" lists the diagnosis ids (see plan-config.js) that suggest this score in a plan. */
(function () {
  const opts = (pairs) => pairs.map(([v, l]) => ({ v, l }));
  const items = (texts, o) => texts.map((t, i) => ({ id: 'q' + (i + 1), text: t, options: o }));
  const sum = (a, list) => list.reduce((s, it) => s + (a[it.id] == null ? 0 : +a[it.id]), 0);
  const answered = (a, list) => list.filter((it) => a[it.id] != null).length;
  const allItems = (s) => s.sections.flatMap((x) => x.items);

  const SCORES = [];

  /* ---------- MG-ADL ---------- */
  const mgadl = [
    ['Talking', [[0, 'Normal'], [1, 'Intermittent slurring or nasal speech'], [2, 'Constant slurring or nasal speech, but can be understood'], [3, 'Difficult to understand speech']]],
    ['Chewing', [[0, 'Normal'], [1, 'Fatigue with solid food'], [2, 'Fatigue with soft food'], [3, 'Gastric (feeding) tube']]],
    ['Swallowing', [[0, 'Normal'], [1, 'Rare episode of choking'], [2, 'Frequent choking that needs changes in diet'], [3, 'Gastric (feeding) tube']]],
    ['Breathing', [[0, 'Normal'], [1, 'Shortness of breath with exertion'], [2, 'Shortness of breath at rest'], [3, 'Ventilator dependence']]],
    ['Brushing teeth or combing hair', [[0, 'No trouble'], [1, 'Extra effort, but no rest periods needed'], [2, 'Rest periods needed'], [3, 'Cannot do one of these']]],
    ['Getting up from a chair', [[0, 'No trouble'], [1, 'Mild, sometimes uses arms'], [2, 'Moderate, always uses arms'], [3, 'Severe, needs help']]],
    ['Double vision', [[0, 'None'], [1, 'Happens, but not daily'], [2, 'Daily, but not constant'], [3, 'Constant']]],
    ['Droopy eyelid', [[0, 'None'], [1, 'Happens, but not daily'], [2, 'Daily, but not constant'], [3, 'Constant']]],
  ];
  SCORES.push({
    id: 'mgadl', name: 'Myasthenia Gravis Activities of Daily Living', short: 'MG-ADL',
    for: ['mg'], who: 'patient', period: 'Think about the past 7 days.',
    intro: 'Eight everyday activities. Pick the answer that fits you best.',
    sections: [{ items: mgadl.map(([t, o], i) => ({ id: 'q' + (i + 1), text: t, options: opts(o) })) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 24, done: answered(a, it) === it.length,
      interp: 'Higher scores mean more symptoms. A drop of 2 or more points is a meaningful improvement.' }; },
    source: 'Wolfe GI et al. Myasthenia gravis activities of daily living profile. Neurology 1999;52:1487-9.',
  });

  /* ---------- MG composite (clinician) ---------- */
  const mgc = [
    ['Ptosis, upward gaze (physician exam)', [[0, '>45 seconds'], [1, '11–45 seconds'], [2, '1–10 seconds'], [3, 'Immediate']]],
    ['Double vision on lateral gaze, left or right (physician exam)', [[0, '>45 seconds'], [1, '11–45 seconds'], [3, '1–10 seconds'], [4, 'Immediate']]],
    ['Eye closure (physician exam)', [[0, 'Normal'], [0, 'Mild weakness (can be forced open with effort)'], [1, 'Moderate weakness (can be forced open easily)'], [2, 'Severe weakness (unable to keep eyes closed)']]],
    ['Talking (patient history)', [[0, 'Normal'], [2, 'Intermittent slurring or nasal speech'], [4, 'Constant slurring or nasal, but can be understood'], [6, 'Difficult to understand speech']]],
    ['Chewing (patient history)', [[0, 'Normal'], [2, 'Fatigue with solid food'], [4, 'Fatigue with soft food'], [6, 'Gastric tube']]],
    ['Swallowing (patient history)', [[0, 'Normal'], [2, 'Rare episode of choking or trouble swallowing'], [5, 'Frequent trouble swallowing, needs diet change'], [6, 'Gastric tube']]],
    ['Breathing, thought to be caused by MG', [[0, 'Normal'], [2, 'Short of breath with exertion'], [4, 'Short of breath at rest'], [9, 'Ventilator dependence']]],
    ['Neck flexion or extension, weakest (physician exam)', [[0, 'Normal'], [1, 'Mild weakness'], [3, 'Moderate weakness (~50% ± 15%)'], [4, 'Severe weakness']]],
    ['Shoulder abduction (physician exam)', [[0, 'Normal'], [2, 'Mild weakness'], [4, 'Moderate weakness (~50% ± 15%)'], [5, 'Severe weakness']]],
    ['Hip flexion (physician exam)', [[0, 'Normal'], [2, 'Mild weakness'], [4, 'Moderate weakness (~50% ± 15%)'], [5, 'Severe weakness']]],
  ];
  SCORES.push({
    id: 'mgc', name: 'Myasthenia Gravis Composite', short: 'MGC',
    for: ['mg'], who: 'clinician', period: 'Completed by your doctor at your visit.',
    intro: '"Moderate weakness" for neck and limb items means about 50% ± 15% of expected normal strength. Anything milder is "mild" and anything more severe is "severe".',
    sections: [{ items: mgc.map(([t, o], i) => ({ id: 'q' + (i + 1), text: t, options: o.map(([v, l], j) => ({ v, l, k: j })) })) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 50, done: answered(a, it) === it.length,
      interp: 'Higher scores mean more weakness. A drop of 3 or more points is a meaningful improvement.' }; },
    source: 'Burns TM et al. The MG Composite. Neurology 2010;74:1434-40.',
  });

  /* ---------- Nerve condition daily activities (adapted) ---------- */
  const irodsO = opts([[0, "Can't do it"], [1, 'With difficulty'], [2, 'Easily']]);
  SCORES.push({
    id: 'irods', name: 'Nerve Condition Daily Activities', short: 'Nerve activities',
    for: ['cidp', 'neuropathy'], who: 'patient', period: 'Think about how you are right now.',
    intro: 'For each activity, pick how easily you can do it.',
    sections: [{ items: items(['Bend down and pick something up', 'Brush your teeth', 'Carry something heavy and set it down', 'Catch a ball', 'Dance', 'Wash dishes', 'Go grocery shopping', 'Put on a shirt', 'Feed yourself', 'Get to a doctor visit', 'Make a sandwich', 'Move a chair', 'Run', 'Read a book or newspaper', 'Sit down on and get up from the toilet', 'Stand for a few hours', 'Shower', 'Turn a key in a lock', 'Climb one flight of stairs', 'Take a bus or train', 'Walk around obstacles', 'Walk outside for up to half a mile', 'Wash your upper body', 'Wash your lower body'], irodsO) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 48, done: answered(a, it) === it.length,
      interp: 'Higher scores mean you can do more. Compare your score from visit to visit.' }; },
    source: 'Adapted by Dr. Kaldawi from published activity scales for immune-mediated neuropathy.',
  });

  /* ---------- INCAT ---------- */
  SCORES.push({
    id: 'incat', name: 'INCAT Disability Scale', short: 'INCAT',
    for: ['cidp'], who: 'patient', period: 'Think about how you are right now.',
    intro: 'Pick one answer for your arms and one for your legs.',
    sections: [{ items: [
      { id: 'arm', text: 'Arm disability', options: opts([[0, 'No problems with my arms'], [1, 'Symptoms in one or both arms, not affecting any of these: doing all zips and buttons, washing or brushing hair, using a knife and fork together, handling small coins'], [2, 'Symptoms affect, but do not prevent, any of those tasks'], [3, 'Symptoms prevent one or two of those tasks'], [4, 'Symptoms prevent three or all of those tasks, but some purposeful movements are still possible'], [5, 'Unable to use either arm for any purposeful movement']]) },
      { id: 'leg', text: 'Leg disability', options: opts([[0, 'Walking is not affected'], [1, 'Walking is affected, but I walk independently outdoors'], [2, 'I usually use support on one side (stick, single crutch, one arm) to walk outdoors'], [3, 'I usually use support on both sides (sticks, crutches, frame, two arms) to walk outdoors'], [4, 'I usually use a wheelchair outdoors, but can stand and walk a few steps with help'], [5, 'Restricted to a wheelchair; unable to stand and walk a few steps with help']]) },
    ] }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 10, done: answered(a, it) === 2,
      lines: [['Arm', a.arm ?? '–'], ['Leg', a.leg ?? '–']],
      interp: 'Higher scores mean more disability. A change of 1 point or more is usually considered meaningful.' }; },
    source: 'Hughes R et al. Randomized controlled trial of IVIG in CIDP (INCAT). Ann Neurol 2001;50:195-201.',
  });

  /* ---------- Small fiber symptom check (adapted) ---------- */
  const siqO = opts([[0, 'Never'], [1, 'Sometimes'], [2, 'Often'], [3, 'Always']]);
  SCORES.push({
    id: 'sfnsiq', name: 'Small Fiber Symptom Check', short: 'Small fiber symptoms',
    for: ['sfn'], who: 'patient', period: 'Think about the past 2 weeks.',
    intro: 'How often have you had each of these?',
    sections: [{ items: items(['Sweating more or less than you used to', 'Diarrhea', 'Constipation', 'Bladder trouble (leaking, or trouble getting started)', 'Dry eyes', 'Dry mouth', 'Lightheaded when you stand up', 'Heart pounding or racing', 'Hot flashes', 'Skin that is extra sensitive to touch', 'Burning feet', "Can't stand heat, or the feel of sheets on your feet", 'Restless legs'], siqO) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); const c = it.filter((x) => +a[x.id] > 0).length; return { total: t, max: 39, done: answered(a, it) === it.length,
      lines: [['Symptoms present', c + ' of 13']], interp: 'Higher scores mean more symptoms. Bring this to each visit so we can see how you respond to treatment.' }; },
    source: 'Adapted by Dr. Kaldawi from published small fiber neuropathy symptom questionnaires.',
  });

  /* ---------- Small fiber daily activities (adapted) ---------- */
  const rodsO = opts([[0, "Can't do it"], [1, 'With difficulty'], [2, 'Easily']]);
  SCORES.push({
    id: 'sfnrods', name: 'Small Fiber Daily Activities', short: 'Small fiber activities',
    for: ['sfn'], who: 'patient', period: 'Think about how you are right now.',
    intro: 'How easily can you…',
    sections: [{ items: items(['Brush your teeth?', 'Make coffee or tea?', 'Turn a key in a lock?', 'Pick up small things?', 'Put on a shirt?', 'Fill out a form?', 'Shower?', 'Sit down from standing?', 'Put on pants and shoes?', 'Use an ATM?', 'Handle coins?', 'Lie down from standing?', 'Button a shirt?', 'Shave or remove hair?', 'Visit family or friends?', 'Catch a ball?', 'Get something out of a low cabinet?', 'Pick something up off the floor?', 'Wash dishes?', 'Cook a meal?', 'Get up from lying down?', 'Go grocery shopping?', 'Open a high window?', 'Sweep with a dustpan and brush?', 'Take a bus or train?', 'Trim your toenails?', 'Walk around obstacles?', 'Stand for 15 minutes?', 'Stand on one leg?', 'Get up from a squat?', 'Carry and set down something heavy (about 20 pounds)?', 'Climb 3 flights of stairs?'], rodsO) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 64, done: answered(a, it) === it.length,
      interp: 'Higher scores mean you can do more. Compare your score from visit to visit.' }; },
    source: 'Adapted by Dr. Kaldawi from published small fiber neuropathy activity scales.',
  });

  /* ---------- IBM-FRS ---------- */
  const ibm = [
    ['Swallowing', ['Needs tube feeding', 'Frequent choking', 'Dietary consistency changes', 'Early eating problems, occasional choking', 'Normal']],
    ['Handwriting (with the hand you used before IBM)', ['Unable to grip pen', 'Able to grip pen but unable to write', 'Not all words are legible', 'Slow or sloppy; all words are legible', 'Normal']],
    ['Cutting food and handling utensils', ['Needs to be fed', 'Food must be cut by someone, but can still feed slowly', 'Can cut most foods, although clumsy and slow; some help needed', 'Somewhat slow and clumsy, but no help needed', 'Normal']],
    ['Fine motor tasks (opening doors, using keys, picking up small objects)', ['Unable', 'Frequently requires help from a caregiver', 'Independent but needs modified techniques or devices', 'Slow or clumsy in completing task', 'Independent']],
    ['Dressing', ['Total dependence', 'Needs help from a caregiver for some clothing items', 'Independent but needs devices or modified techniques (Velcro, shirts without buttons)', 'Independent but with more effort or less efficiency', 'Normal']],
    ['Hygiene (bathing and toileting)', ['Completely dependent', 'Needs occasional help from a caregiver', 'Independent but needs devices (shower chair, raised toilet seat)', 'Independent but with more effort', 'Normal']],
    ['Turning in bed and adjusting covers', ['Unable or needs total help', 'Can start, but cannot turn or adjust sheets alone', 'Can turn alone or adjust sheets, but with great difficulty', 'Somewhat slow and clumsy, but no help needed', 'Normal']],
    ['Sit to stand', ['Unable to stand', 'Needs help from a device or person', 'Needs to use arms', 'Uses substitute motions (leaning forward, rocking) but not arms', 'Independent, without using arms']],
    ['Walking', ['Wheelchair dependent', 'Dependent on an assistive device', 'Uses a device some of the time (brace, cane, walker)', 'Slow or mild unsteadiness', 'Normal']],
    ['Climbing stairs', ['Cannot climb stairs', 'Needs handrail plus another support (cane or person)', 'Dependent on handrail', 'Slow, hesitant, or more effort; uses handrail sometimes', 'Normal']],
  ];
  SCORES.push({
    id: 'ibmfrs', name: 'Inclusion Body Myositis Functional Rating Scale', short: 'IBM-FRS',
    for: ['myositis'], who: 'patient', period: 'Think about how you are right now.',
    intro: 'Pick the answer that fits you best for each activity.',
    sections: [{ items: ibm.map(([t, o], i) => ({ id: 'q' + (i + 1), text: t, options: o.map((l, v) => ({ v, l })).reverse() })) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 40, done: answered(a, it) === it.length,
      interp: 'Higher scores mean better function (40 is normal).' }; },
    source: 'Jackson CE et al. Inclusion body myositis functional rating scale. Muscle Nerve 2008;37:473-6.',
  });

  /* ---------- Daily function and pain check (adapted) ---------- */
  const haqO = opts([[0, 'No trouble'], [1, 'Some trouble'], [2, 'A lot of trouble'], [3, "Can't do it"]]);
  const haqCats = [
    ['dress', 'Getting dressed and grooming', ['Get dressed, including shoelaces and buttons?', 'Wash your hair?']],
    ['arise', 'Getting up', ['Stand up from a chair without arms?', 'Get in and out of bed?']],
    ['eat', 'Eating', ['Cut up meat?', 'Lift a full glass to your mouth?', 'Open a new carton of milk?']],
    ['walk', 'Walking', ['Walk outside on flat ground?', 'Climb five steps?']],
    ['hyg', 'Washing and toileting', ['Wash and dry your body?', 'Take a bath in a tub?', 'Get on and off the toilet?']],
    ['reach', 'Reaching', ['Reach up and get a 5-pound bag down from just above your head?', 'Bend down and pick clothes up off the floor?']],
    ['grip', 'Gripping', ['Open a car door?', 'Open a jar that has been opened before?', 'Turn a faucet on and off?']],
    ['act', 'Errands and chores', ['Run errands and shop?', 'Get in and out of a car?', 'Do chores like vacuuming or yard work?']],
  ];
  const devices = [['cane', 'Cane', 'walk'], ['walker', 'Walker', 'walk'], ['crutch', 'Crutches', 'walk'], ['wchair', 'Wheelchair', 'walk'],
    ['ddev', 'Dressing aids (button hook, zipper pull, long shoe horn)', 'dress'], ['utens', 'Special or built-up utensils', 'eat'], ['chair', 'Special or raised chair', 'arise'],
    ['toilet', 'Raised toilet seat', 'hyg'], ['tseat', 'Tub or shower seat', 'hyg'], ['tbar', 'Grab bar in the tub', 'hyg'], ['lhbath', 'Long-handled bath tools', 'hyg'],
    ['lhreach', 'Reacher or grabber', 'reach'], ['jar', 'Jar opener', 'grip']];
  SCORES.push({
    id: 'haq', name: 'Daily Function and Pain Check', short: 'Daily function',
    for: ['myositis'], who: 'patient', period: 'Think about how you usually did over the past week.',
    intro: 'How much trouble do you have with each of these? If one does not apply to you, skip it.',
    sections: [
      ...haqCats.map(([cid, title, qs]) => ({ title, items: qs.map((q, i) => ({ id: cid + i, cat: cid, text: q, options: haqO })) })),
      { title: 'Tools or aids you usually use', items: devices.map(([id, l, cat]) => ({ id: 'dev_' + id, cat, text: l, type: 'check' })) },
      { title: 'Things you usually need another person to help with', items: haqCats.map(([cid, title]) => ({ id: 'help_' + cid, cat: cid, text: title, type: 'check' })) },
      { title: 'Pain', items: [{ id: 'pain', text: 'How much pain have you had from your condition over the past week? (0 = none, 100 = severe)', type: 'range', min: 0, max: 100 }] },
    ],
    compute(a) {
      let total = 0, n = 0; const lines = [];
      for (const [cid, title, qs] of haqCats) {
        const vals = qs.map((q, i) => a[cid + i]).filter((v) => v != null).map(Number);
        if (!vals.length) continue;
        let sc = Math.max(...vals);
        const aided = devices.some(([id, , c]) => c === cid && a['dev_' + id]) || a['help_' + cid];
        if (aided && sc < 2) sc = 2;
        total += sc; n++; lines.push([title, sc + (aided ? ' (aid/help)' : '')]);
      }
      if (a.pain != null) lines.push(['Pain (0–100)', a.pain]);
      const di = n ? total / n : 0;
      return { total: n >= 6 ? di.toFixed(2) : '–', max: 3, done: n >= 6, lines,
        interp: n >= 6 ? 'Each area counts its hardest task. Using an aid or needing help counts as at least "a lot of trouble." 0 means no trouble and 3 means the most.' : 'Answer at least 6 of the 8 areas to get a score.' };
    },
    source: 'Adapted by Dr. Kaldawi from published daily-function questionnaires.',
  });

  /* ---------- Bain & Findley ADL ---------- */
  const bfO = opts([[1, 'Without difficulty'], [2, 'With a little effort'], [3, 'With a lot of effort'], [4, 'Cannot do it by myself']]);
  SCORES.push({
    id: 'bfadl', name: 'Bain & Findley Tremor Activities of Daily Living', short: 'BF-ADL',
    for: ['tremor', 'parkinson'], who: 'patient', period: 'Think about how you are right now.',
    intro: 'How easy or hard is it for you to do each activity?',
    sections: [{ items: items(['Cut food with a knife and fork', 'Use a spoon to drink soup', 'Hold a cup of tea', 'Pour milk from a bottle or carton', 'Wash and dry dishes', 'Brush your teeth', 'Use a handkerchief to blow your nose', 'Use a bath', 'Use a toilet', 'Wash your face and hands', 'Tie your shoelaces', 'Do up buttons', 'Do up a zipper', 'Write a letter', 'Put a letter in an envelope', 'Hold and read a newspaper', 'Dial a telephone', 'Make yourself understood on the telephone', 'Watch TV', 'Pick up your change in a shop', 'Insert an electric plug into a socket', 'Unlock your front door with a key', 'Walk up and down stairs', 'Get up out of an armchair', 'Carry'], bfO) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); return { total: t, max: 100, min: 25, done: answered(a, it) === it.length,
      interp: 'Scores range from 25 to 100. Higher scores mean tremor gets in the way more.' }; },
    source: 'Bain PG, Findley LJ, Atchison P et al. Assessing tremor severity. J Neurol Neurosurg Psychiatry 1993;56:868-73.',
  });

  /* ---------- Sleep apnea risk check (adapted) ---------- */
  const yn = opts([[1, 'Yes'], [0, 'No']]);
  SCORES.push({
    id: 'stopbang', name: 'Sleep Apnea Risk Check', short: 'Sleep apnea check',
    for: ['sleep', 'headache'], who: 'patient', period: '',
    intro: 'Answer yes or no.',
    sections: [{ items: [
      { id: 's', text: 'Do people tell you that you snore loudly?', options: yn },
      { id: 't', text: 'Are you often tired or sleepy during the day?', options: yn },
      { id: 'o', text: 'Has anyone seen you stop breathing, choke, or gasp in your sleep?', options: yn },
      { id: 'p', text: 'Do you have high blood pressure, or take medicine for it?', options: yn },
      { id: 'b', text: 'Is your BMI over 35?', options: yn, help: 'bmi' },
      { id: 'a', text: 'Are you over 50?', options: yn },
      { id: 'n', text: 'Is your neck (shirt collar size) over 16 inches?', options: yn },
      { id: 'g', text: 'Are you male?', options: yn },
    ] }],
    compute(a, s) {
      const it = allItems(s); const t = sum(a, it); const first4 = ['s', 't', 'o', 'p'].reduce((x, k) => x + (+a[k] || 0), 0);
      let risk = t <= 2 ? 'Low chance' : t <= 4 ? 'Medium chance' : 'High chance';
      if (t >= 3 && t <= 4 && first4 >= 2 && (+a.g || +a.b || +a.n)) risk = 'High chance';
      return { total: t, max: 8, done: answered(a, it) === it.length, badge: risk,
        interp: 'Chance of sleep apnea: 0–2 low, 3–4 medium, 5–8 high. A 3 or 4 also counts as high if at least 2 of the first 4 answers are yes and you are male, have a BMI over 35, or have a neck over 16 inches. If your chance is medium or high, ask us about a sleep study.' };
    },
    source: 'Adapted by Dr. Kaldawi from published sleep apnea screening questions.',
  });

  /* ---------- Headache impact check (adapted) ---------- */
  const hdiO = opts([[4, 'Yes'], [2, 'Sometimes'], [0, 'No']]);
  const hdiQ = [
    ['F', 'My headaches make me feel disabled.'], ['F', 'My headaches limit my usual daily activities.'],
    ['E', "Nobody understands how my headaches affect my life."], ['F', 'I cut back on sports or hobbies because of my headaches.'],
    ['E', 'My headaches make me angry.'], ['E', 'My headaches make me feel like I might lose control.'],
    ['F', 'I socialize less because of my headaches.'], ['E', "My family and friends don't know what I go through with my headaches."],
    ['E', 'My headaches are so bad I feel like I could go crazy.'], ['E', 'My headaches affect how I see the world.'],
    ['E', "I'm afraid to leave the house when I feel a headache coming on."], ['E', 'My headaches make me feel desperate.'],
    ['F', 'I worry my headaches are costing me at work or at home.'], ['E', 'My headaches strain my relationships with family or friends.'],
    ['F', 'I stay away from people when I have a headache.'], ['F', 'My headaches get in the way of my life goals.'],
    ['F', "I can't think clearly because of my headaches."], ['F', 'My headaches make my muscles tense.'],
    ['F', "I don't enjoy social events because of my headaches."], ['E', 'My headaches make me irritable.'],
    ['F', 'I avoid traveling because of my headaches.'], ['E', 'My headaches make me feel confused.'], ['E', 'My headaches frustrate me.'],
    ['F', 'Reading is hard because of my headaches.'], ['F', "It's hard to focus on anything besides my headaches."],
  ];
  SCORES.push({
    id: 'hdi', name: 'Headache Impact Check', short: 'Headache impact',
    for: ['headache'], who: 'patient', period: '',
    intro: 'Answer each one about your headaches only.',
    sections: [
      { title: 'About your headaches', items: [
        { id: 'freq', text: 'How often do you get headaches?', options: opts([[1, 'About once a month'], [2, '2 to 3 times a month'], [3, 'More than once a week']]), unscored: true },
        { id: 'sev', text: 'How bad are they usually?', options: opts([[1, 'Mild'], [2, 'Moderate'], [3, 'Severe']]), unscored: true } ] },
      { title: 'How headaches affect you', items: hdiQ.map(([k, t], i) => ({ id: 'q' + (i + 1), sub: k, text: t, options: hdiO })) },
    ],
    compute(a, s) {
      const it = s.sections[1].items; const t = sum(a, it);
      const f = sum(a, it.filter((x) => x.sub === 'F')), e = sum(a, it.filter((x) => x.sub === 'E'));
      return { total: t, max: 100, done: answered(a, it) === it.length, lines: [['Daily life', f + ' / 52'], ['Feelings', e + ' / 48']],
        interp: 'Higher scores mean headaches have a bigger impact on your life. Look for a change of about 30 points between visits.' };
    },
    source: 'Adapted by Dr. Kaldawi from published headache disability questionnaires.',
  });

  /* ---------- Post-Concussion Symptom Scale ---------- */
  const pcO = [0, 1, 2, 3, 4, 5, 6].map((v) => ({ v, l: String(v) }));
  SCORES.push({
    id: 'pcss', name: 'Post-Concussion Symptom Scale', short: 'PCSS',
    for: ['concussion'], who: 'patient', period: 'Rate how you feel right now. 0 = none, 3 = moderate, 6 = severe.',
    intro: 'Fill this out on your own each time to track your recovery.', scale: true,
    sections: [{ items: items(['Headache', 'Nausea', 'Vomiting', 'Balance problems', 'Dizziness', 'Fatigue', 'Trouble falling asleep', 'Sleeping more than usual', 'Sleeping less than usual', 'Drowsiness', 'Sensitivity to light', 'Sensitivity to noise', 'Irritability', 'Sadness', 'Nervousness', 'Feeling more emotional', 'Numbness or tingling', 'Feeling slowed down', 'Feeling "foggy"', 'Difficulty concentrating', 'Difficulty remembering', 'Visual problems'], pcO) }],
    compute(a, s) { const it = allItems(s); const t = sum(a, it); const c = it.filter((x) => +a[x.id] > 0).length; return { total: t, max: 132, done: answered(a, it) === it.length,
      lines: [['Number of symptoms', c + ' of 22']],
      interp: 'Higher scores mean more symptoms. Some people have a few of these symptoms at baseline (for example, trouble concentrating with ADHD, or sadness with depression), so you do not need a score of zero to return to activity.' }; },
    source: 'Lovell MR et al. Post-Concussion Symptom Scale. Appl Neuropsychol 2006;13:166-74.',
  });

  /* ---------- Fibromyalgia ---------- */
  const wpi = ['Left jaw', 'Right jaw', 'Neck', 'Left shoulder girdle', 'Right shoulder girdle', 'Upper back', 'Left upper arm', 'Right upper arm', 'Lower back', 'Left lower arm', 'Right lower arm', 'Chest', 'Left hip (buttock)', 'Right hip (buttock)', 'Abdomen', 'Left upper leg', 'Right upper leg', 'Left lower leg', 'Right lower leg'];
  const sssO = opts([[0, 'No problem'], [1, 'Slight or mild, comes and goes'], [2, 'Moderate, often present'], [3, 'Severe, constant, life-disturbing']]);
  SCORES.push({
    id: 'fm', name: 'Fibromyalgia Diagnostic and Severity Score', short: 'Fibromyalgia',
    for: ['fibromyalgia'], who: 'patient', period: '',
    intro: 'This follows the modified 2010/2011 American College of Rheumatology criteria. No tender-point exam is needed.',
    sections: [
      { title: 'Part 1: Where have you had pain in the past week?', cols: true, items: wpi.map((t, i) => ({ id: 'w' + i, text: t, type: 'check' })) },
      { title: 'Part 2a: How bad have these been in the past week?', items: [
        { id: 'fat', text: 'Fatigue', options: sssO }, { id: 'unr', text: 'Waking up unrefreshed', options: sssO }, { id: 'cog', text: 'Thinking or memory problems ("fog")', options: sssO } ] },
      { title: 'Part 2b: Other symptoms in the past 6 months', items: [
        { id: 'som', text: 'Overall, how many other body symptoms have you had (such as headaches, pain or cramps in the lower belly, or low mood)?', options: opts([[0, 'None'], [1, 'A few'], [2, 'A moderate number'], [3, 'A great deal']]) } ] },
      { title: 'Part 3: Your doctor completes', items: [
        { id: 'dur', text: 'Symptoms at a similar level for at least 3 months', type: 'check' },
        { id: 'alt', text: 'No other disorder would otherwise explain the pain', type: 'check' } ] },
    ],
    compute(a) {
      const w = wpi.reduce((s, t, i) => s + (a['w' + i] ? 1 : 0), 0);
      const s2a = ['fat', 'unr', 'cog'].reduce((s, k) => s + (+a[k] || 0), 0); const sss = s2a + (+a.som || 0);
      const thr = (w >= 7 && sss >= 5) || (w >= 3 && w <= 6 && sss >= 9);
      const met = thr && a.dur && a.alt;
      return { total: w + sss, max: 31, done: true, label: 'Severity (FS) score',
        lines: [['Widespread Pain Index', w + ' / 19'], ['Symptom Severity', sss + ' / 12'], ['Pain and severity threshold', thr ? 'Met' : 'Not met']],
        badge: met ? 'Criteria met' : thr ? 'Threshold met; doctor to confirm Part 3' : 'Criteria not met',
        interp: 'Threshold: WPI 7 or more with SSS 5 or more, or WPI 3–6 with SSS 9 or more. The severity score (0–31) tracks overall symptom burden over time. The 2016 revision also requires pain in at least 4 of 5 body regions.' };
    },
    source: 'Wolfe F et al. Modified 2010/2011 ACR fibromyalgia survey criteria; Winslow et al. Am Fam Physician 2023.',
  });

  /* ---------- Memory and thinking test (clinic) ---------- */
  SCORES.push({
    id: 'moca', name: 'Memory and Thinking Test', short: 'Memory test', for: ['dementia'], who: 'clinician', linkOnly: true,
    intro: 'A short test of memory, attention, language, and problem solving that we do with you in clinic. It is not a self-test, so it is not on this site. We repeat it over time to track changes.',
    source: '',
  });

  window.SCORES = SCORES;
})();
