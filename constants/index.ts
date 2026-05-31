// API — swap this for your Railway URL when backend is deployed
export const API_BASE_URL = 'https://cadence-api.rohanmarar.com'

// Colors — dark theme with bright purple accent
export const Colors = {
  background:     '#0A0A0F',
  surface:        '#11161F',
  surfaceHigh:    '#18222E',

  accent:         '#3B82F6',      // pure glacier blue (but less harsh)
  accentDim:      '#1E5FD9',

  textPrimary:    '#EEF5FF',
  textSecondary:  '#BDD3FF',
  textMuted:      '#7A95B0',

  save:           '#2DD4BF',
  skip:           '#F87171',
  share:          '#FBBF24',

  border:         '#253545',
  cardGradientTop:    'rgba(59, 130, 246, 0.12)',
  cardGradientBottom: 'rgba(10, 10, 15, 0.95)',
}
// Typography
export const Fonts = {
  sizes: {
    xs:   11,
    sm:   13,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  26,
    hero: 32,
  },
  weights: {
    regular:    '400' as const,
    medium:     '500' as const,
    semibold:   '600' as const,
    bold:       '700' as const,
  }
}

// Spacing
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
}

// Card swipe thresholds
export const Swipe = {
  threshold:        120,   // px to trigger save/skip
  rotationFactor:   0.08,  // how much card rotates while dragging
  outOfScreenX:     500,   // how far card flies off screen
}

// ── Add these to constants/index.ts ──────────────────────────────────────────

export const DIFFICULTY_OPTIONS = [
  {
    id:    'accessible',
    label: 'Accessible',
    emoji: '🌱',
    desc:  'Plain-language papers, reviews, and explainers. Great for curious non-specialists.',
  },
  {
    id:    'technical',
    label: 'Technical',
    emoji: '⚗️',
    desc:  'Standard research papers. Assumes familiarity with the field.',
  },
  {
    id:    'expert',
    label: 'Expert',
    emoji: '🔬',
    desc:  'Dense, specialist papers from top journals and proceedings.',
  },
  {
    id:    'any',
    label: 'Any Level',
    emoji: '✦',
    desc:  'No filter — show everything regardless of complexity.',
  },
]

export const DETAILED_TOPICS = [
  // ── Computer Science ───────────────────────────────────────────────────────
  {
    id:     'cs_ai',
    label:  'Artificial Intelligence',
    abbrev: 'cs.AI',
    emoji:  '🤖',
    desc:   'Reasoning, planning, knowledge representation, and general AI systems.',
    categories: ['cs.ai', 'cs.lg', 'cs.ne'],
  },
  {
    id:     'cs_ml',
    label:  'Machine Learning',
    abbrev: 'cs.LG',
    emoji:  '🧠',
    desc:   'Learning algorithms, neural networks, deep learning, and statistical models.',
    categories: ['cs.lg', 'stat.ml'],
  },
  {
    id:     'cs_nlp',
    label:  'Natural Language Processing',
    abbrev: 'cs.CL',
    emoji:  '💬',
    desc:   'Language models, text understanding, translation, and speech processing.',
    categories: ['cs.cl', 'cs.ir'],
  },
  {
    id:     'cs_cv',
    label:  'Computer Vision',
    abbrev: 'cs.CV',
    emoji:  '👁️',
    desc:   'Image recognition, object detection, video analysis, and visual understanding.',
    categories: ['cs.cv'],
  },
  {
    id:     'cs_ro',
    label:  'Robotics',
    abbrev: 'cs.RO',
    emoji:  '🦾',
    desc:   'Robot control, motion planning, manipulation, and autonomous systems.',
    categories: ['cs.ro', 'cs.sy'],
  },
  {
    id:     'cs_cr',
    label:  'Cryptography & Security',
    abbrev: 'cs.CR',
    emoji:  '🔐',
    desc:   'Encryption, privacy, network security, and formal verification.',
    categories: ['cs.cr'],
  },
  {
    id:     'cs_hci',
    label:  'Human-Computer Interaction',
    abbrev: 'cs.HC',
    emoji:  '🖥️',
    desc:   'UX research, accessibility, interfaces, and human-centered design.',
    categories: ['cs.hc'],
  },
  {
    id:     'cs_ds',
    label:  'Algorithms & Data Structures',
    abbrev: 'cs.DS',
    emoji:  '📊',
    desc:   'Complexity theory, algorithms, combinatorics, and graph theory.',
    categories: ['cs.ds', 'cs.dm'],
  },

  // ── Biology & Life Sciences ────────────────────────────────────────────────
  {
    id:     'bio_genomics',
    label:  'Genomics & Genetics',
    abbrev: 'q-bio.GN',
    emoji:  '🧬',
    desc:   'DNA sequencing, gene expression, CRISPR, and genome-wide studies.',
    categories: ['q-bio.gn', 'q-bio.qm', 'genomics', 'genetics'],
  },
  {
    id:     'bio_neuro',
    label:  'Neuroscience',
    abbrev: 'q-bio.NC',
    emoji:  '🧪',
    desc:   'Brain imaging, neural circuits, cognition, and computational neuroscience.',
    categories: ['q-bio.nc', 'psych', 'neuro'],
  },
  {
    id:     'bio_cell',
    label:  'Cell & Molecular Biology',
    abbrev: 'q-bio.CB',
    emoji:  '🔬',
    desc:   'Cell signaling, protein structure, biochemistry, and molecular mechanisms.',
    categories: ['q-bio.cb', 'q-bio.bm', 'biochem', 'biology'],
  },
  {
    id:     'bio_ecology',
    label:  'Ecology & Evolution',
    abbrev: 'q-bio.PE',
    emoji:  '🌿',
    desc:   'Population dynamics, evolutionary biology, ecosystems, and biodiversity.',
    categories: ['q-bio.pe', 'q-bio.to', 'ecology'],
  },

  // ── Medicine & Health ──────────────────────────────────────────────────────
  {
    id:     'med_clinical',
    label:  'Clinical Medicine',
    abbrev: 'med',
    emoji:  '🏥',
    desc:   'Clinical trials, diagnostics, treatment outcomes, and patient care.',
    categories: ['med', 'health', 'clinical', 'pubmed'],
  },
  {
    id:     'med_imaging',
    label:  'Medical Imaging & AI',
    abbrev: 'eess.IV',
    emoji:  '🩻',
    desc:   'MRI, CT, ultrasound analysis, and AI-assisted diagnosis.',
    categories: ['eess.iv', 'cs.cv', 'medical imaging'],
  },
  {
    id:     'med_pharma',
    label:  'Pharmacology & Drug Discovery',
    abbrev: 'q-bio.QM',
    emoji:  '💊',
    desc:   'Drug design, clinical pharmacology, and molecular therapeutics.',
    categories: ['q-bio.qm', 'pharmacol', 'drug'],
  },

  // ── Physics ────────────────────────────────────────────────────────────────
  {
    id:     'phys_quantum',
    label:  'Quantum Physics',
    abbrev: 'quant-ph',
    emoji:  '⚛️',
    desc:   'Quantum computing, quantum information, entanglement, and foundations.',
    categories: ['quant-ph'],
  },
  {
    id:     'phys_condensed',
    label:  'Condensed Matter',
    abbrev: 'cond-mat',
    emoji:  '🧲',
    desc:   'Superconductivity, materials science, phase transitions, and solid-state physics.',
    categories: ['cond-mat'],
  },
  {
    id:     'phys_astro',
    label:  'Astrophysics & Cosmology',
    abbrev: 'astro-ph',
    emoji:  '🔭',
    desc:   'Black holes, dark matter, exoplanets, and the large-scale universe.',
    categories: ['astro-ph'],
  },
  {
    id:     'phys_hep',
    label:  'High Energy Physics',
    abbrev: 'hep',
    emoji:  '💥',
    desc:   'Particle physics, the Standard Model, colliders, and field theory.',
    categories: ['hep-ph', 'hep-th', 'hep-ex'],
  },

  // ── Mathematics & Statistics ───────────────────────────────────────────────
  {
    id:     'math_pure',
    label:  'Pure Mathematics',
    abbrev: 'math',
    emoji:  '📐',
    desc:   'Algebra, topology, analysis, number theory, and geometry.',
    categories: ['math.ag', 'math.nt', 'math.at', 'math.gr', 'math'],
  },
  {
    id:     'math_stats',
    label:  'Statistics & Probability',
    abbrev: 'stat',
    emoji:  '📈',
    desc:   'Statistical inference, Bayesian methods, probability theory, and data analysis.',
    categories: ['stat.th', 'stat.me', 'math.pr', 'stat'],
  },
  {
    id:     'math_applied',
    label:  'Applied Mathematics',
    abbrev: 'math.NA',
    emoji:  '🔢',
    desc:   'Numerical analysis, optimization, differential equations, and scientific computing.',
    categories: ['math.na', 'math.oc', 'math.ap'],
  },

  // ── Economics & Social Sciences ────────────────────────────────────────────
  {
    id:     'econ_theory',
    label:  'Economics & Game Theory',
    abbrev: 'econ',
    emoji:  '💹',
    desc:   'Microeconomics, macroeconomics, mechanism design, and behavioral economics.',
    categories: ['econ.th', 'econ.gn', 'econ'],
  },
  {
    id:     'econ_finance',
    label:  'Finance & Markets',
    abbrev: 'q-fin',
    emoji:  '🏦',
    desc:   'Asset pricing, risk management, market microstructure, and financial modeling.',
    categories: ['q-fin', 'finance'],
  },

  // ── Psychology & Cognitive Science ─────────────────────────────────────────
  {
    id:     'psych_cog',
    label:  'Psychology & Cognition',
    abbrev: 'psych',
    emoji:  '🧩',
    desc:   'Cognitive psychology, decision-making, perception, and mental health research.',
    categories: ['psych', 'cog'],
  },

  // ── Earth & Environment ────────────────────────────────────────────────────
  {
    id:     'env_climate',
    label:  'Climate & Environment',
    abbrev: 'atmos',
    emoji:  '🌍',
    desc:   'Climate change, atmospheric science, sustainability, and environmental policy.',
    categories: ['atmos', 'environ', 'climate'],
  },

  // ── Humanities ─────────────────────────────────────────────────────────────
  {
    id:     'phil_ethics',
    label:  'Philosophy & Ethics',
    abbrev: 'phil',
    emoji:  '🏛️',
    desc:   'Ethics, epistemology, philosophy of mind, and AI ethics.',
    categories: ['phil', 'ethics'],
  },
  {
    id:     'hist_social',
    label:  'History & Social Sciences',
    abbrev: 'hist',
    emoji:  '📜',
    desc:   'Historical research, sociology, political science, and cultural studies.',
    categories: ['history', 'humanities', 'social'],
  },
]

export const ROLES = [
  {
    id:    'student',
    label: 'Student',
    emoji: '🎓',
    desc:  'Undergraduate or graduate student exploring research.',
  },
  {
    id:    'researcher',
    label: 'Researcher',
    emoji: '🔬',
    desc:  'Academic or industry researcher publishing and reading papers.',
  },
  {
    id:    'professor',
    label: 'Professor / Faculty',
    emoji: '👨‍🏫',
    desc:  'Teaching and conducting research at a university.',
  },
  {
    id:    'industry',
    label: 'Industry Professional',
    emoji: '💼',
    desc:  'Applying research in a company or startup.',
  },
  {
    id:    'curious',
    label: 'Curious Learner',
    emoji: '🌱',
    desc:  'Passionate about science without a formal research role.',
  },
]
 
export const READING_GOALS = [
  {
    id:    'stay_current',
    label: 'Stay Current',
    emoji: '📡',
    desc:  'Keep up with the latest papers in my field as they come out.',
  },
  {
    id:    'deep_dive',
    label: 'Deep Dive',
    emoji: '🤿',
    desc:  'Thoroughly understand foundational and highly-cited work.',
  },
  {
    id:    'broad',
    label: 'Broad Exploration',
    emoji: '🗺️',
    desc:  'Discover interesting research across many different fields.',
  },
  {
    id:    'specific',
    label: 'Specific Project',
    emoji: '🎯',
    desc:  'Research a particular topic for a paper, thesis, or project.',
  },
]
 
export const EXPERIENCE_LEVELS = [
  {
    id:    'beginner',
    label: 'New to Research',
    emoji: '🌱',
    desc:  'Just starting out — prefer plain-language introductions.',
  },
  {
    id:    'intermediate',
    label: 'Comfortable',
    emoji: '⚗️',
    desc:  'Familiar with academic papers and field-specific terminology.',
  },
  {
    id:    'expert',
    label: 'Expert',
    emoji: '🏆',
    desc:  'Deep specialist knowledge — prefer dense, technical papers.',
  },
]
 
export const WEEKLY_GOALS = [
  { id: 3,   label: '3 papers',  emoji: '🎯', desc: 'Light — just the highlights' },
  { id: 5,   label: '5 papers',  emoji: '📚', desc: 'Moderate — good habit' },
  { id: 10,  label: '10 papers', emoji: '🔥', desc: 'Serious — active researcher' },
  { id: 20,  label: '20+ papers',emoji: '🚀', desc: 'Intense — fully immersed' },
]
 