/* Diagnoses for the plan builder.
   resources: categories in content/resources.md (the {#id} after each heading).
   sections:  medication files whose medicines are shown first for this diagnosis (and whose
              "About this condition" text is added to the plan).
   scores:    tracking scores suggested for this diagnosis (ids in scores.js).
   seeds:     use the SEEDS headache lifestyle plan instead of the general one.
   ohpots:    turn on the orthostatic hypotension / POTS add-on.
   immune:    show the immune medicines (Part C). */
window.PLAN_CONFIG = {
  alwaysResources: ['research', 'medication-help', 'general'],
  conditions: [
    { group: 'Headache', id: 'headache', label: 'Migraine or other headache', resources: ['headache'], sections: ['02'], scores: ['hdi'], seeds: true },
    { group: 'Headache', id: 'vestibular', label: 'Vestibular migraine', resources: ['headache', 'dizziness'], sections: ['02'], scores: ['hdi'], seeds: true },
    { group: 'Headache', id: 'iih', label: 'IIH (high brain fluid pressure)', resources: ['headache'], sections: ['02'], scores: ['hdi'], seeds: true },
    { group: 'Headache', id: 'cluster', label: 'Cluster headache', resources: ['headache'], sections: ['03'], scores: ['hdi'], seeds: true },
    { group: 'Headache', id: 'tn', label: 'Trigeminal neuralgia', resources: ['neuromuscular'], sections: ['04'], scores: [] },

    { group: 'Nerve and muscle', id: 'neuropathy', label: 'Peripheral neuropathy', resources: ['neuromuscular'], sections: ['01'], scores: ['irods'] },
    { group: 'Nerve and muscle', id: 'sfn', label: 'Small fiber neuropathy', resources: ['neuromuscular'], sections: ['01'], scores: ['sfnsiq', 'sfnrods'] },
    { group: 'Nerve and muscle', id: 'cidp', label: 'CIDP or GBS', resources: ['neuromuscular'], sections: ['c2'], scores: ['irods', 'incat'], immune: true },
    { group: 'Nerve and muscle', id: 'vasculitic', label: 'Vasculitic neuropathy', resources: ['neuromuscular'], sections: ['c2'], scores: ['irods'], immune: true },
    { group: 'Nerve and muscle', id: 'mg', label: 'Myasthenia gravis or LEMS', resources: ['neuromuscular'], sections: ['11', 'c2'], scores: ['mgadl', 'mgc'], immune: true },
    { group: 'Nerve and muscle', id: 'myositis', label: 'Myositis or inclusion body myositis', resources: ['neuromuscular'], sections: ['c2'], scores: ['ibmfrs', 'haq'], immune: true },
    { group: 'Nerve and muscle', id: 'als', label: 'ALS', resources: ['neuromuscular'], sections: ['10'], scores: [] },
    { group: 'Nerve and muscle', id: 'spasticity', label: 'Spasticity, cramps, or myotonia', resources: ['neuromuscular'], sections: ['09'], scores: [] },
    { group: 'Nerve and muscle', id: 'pp', label: 'Periodic paralysis', resources: ['neuromuscular'], sections: ['12'], scores: [] },
    { group: 'Nerve and muscle', id: 'genetic', label: 'SMA, Fabry, hereditary ATTR, or Pompe', resources: ['neuromuscular'], sections: ['13'], scores: [] },
    { group: 'Nerve and muscle', id: 'fibromyalgia', label: 'Fibromyalgia or chronic pain', resources: ['neuromuscular'], sections: ['01'], scores: ['fm'] },

    { group: 'Brain and spinal cord', id: 'epilepsy', label: 'Seizures or epilepsy', resources: ['epilepsy'], sections: ['05'], scores: [] },
    { group: 'Brain and spinal cord', id: 'ms', label: 'Multiple sclerosis', resources: ['ms'], sections: ['08', 'c2'], scores: [], immune: true },
    { group: 'Brain and spinal cord', id: 'nmosd', label: 'NMOSD or MOGAD', resources: ['ms'], sections: ['c2'], scores: [], immune: true },
    { group: 'Brain and spinal cord', id: 'dementia', label: 'Memory problems or dementia', resources: ['dementia'], sections: ['07'], scores: ['moca'] },
    { group: 'Brain and spinal cord', id: 'stroke', label: 'Stroke', resources: ['stroke'], sections: [], scores: [] },
    { group: 'Brain and spinal cord', id: 'concussion', label: 'Concussion or TBI', resources: ['concussion'], sections: [], scores: ['pcss'] },
    { group: 'Brain and spinal cord', id: 'fnd', label: 'Functional neurologic disorder', resources: ['fnd'], sections: [], scores: [] },

    { group: 'Movement', id: 'parkinson', label: "Parkinson's disease", resources: ['movement'], sections: ['06'], scores: ['bfadl'] },
    { group: 'Movement', id: 'tremor', label: 'Tremor', resources: ['movement'], sections: ['06'], scores: ['bfadl'] },
    { group: 'Movement', id: 'movement', label: 'Other movement disorder (dystonia, ataxia, chorea)', resources: ['movement'], sections: ['06'], scores: [] },

    { group: 'Autonomic, sleep, and other', id: 'ohpots', label: 'Orthostatic hypotension or POTS', resources: ['dizziness'], sections: ['14'], scores: [], ohpots: true },
    { group: 'Autonomic, sleep, and other', id: 'bppv', label: 'Positional vertigo (BPPV)', resources: ['dizziness'], sections: [], scores: [], handouts: ['epley'] },
    { group: 'Autonomic, sleep, and other', id: 'dizziness', label: 'Dizziness, vertigo, or balance problems', resources: ['dizziness'], sections: [], scores: [] },
    { group: 'Autonomic, sleep, and other', id: 'sleep', label: 'Sleep problems or restless legs', resources: ['sleep'], sections: ['16'], scores: ['stopbang'] },
    { group: 'Autonomic, sleep, and other', id: 'bladder', label: 'Bladder problems', resources: [], sections: ['15'], scores: [] },
  ],
  /* Handouts (content/handouts). "conds" and "meds" turn a handout on automatically in the plan builder. */
  handouts: [
    { id: 'epley', file: 'epley', title: 'Epley maneuver (BPPV)', conds: ['bppv'], meds: [] },
    { id: 'controlled', file: 'controlled-agreement', title: 'Controlled medicine agreement', conds: [],
      meds: ['methadone', 'tramadol', 'other-opioids', 'low-dose-opioid', 'diazepam', 'diazepam-17', 'clonazepam', 'temazepam', 'nayzilam'] },
  ],
  /* Medicine files in the order they appear in the guide. */
  medFiles: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', 'c2'],
};
