/**
 * Sample obstacles representing real-world perils, barriers, and hazards
 * encountered by refugees seeking asylum in Europe.
 * Used as fallback data when webmap layer is absent or offline.
 */

export const SAMPLE_OBSTACLES = [
  {
    id: "obs-med-central",
    title: "Central Mediterranean Open Sea Peril",
    category: "Maritime Hazard",
    weight: 10,
    geometry: {
      type: "point",
      longitude: 14.2,
      latitude: 34.5
    },
    description: "The world's deadliest migration route. Refugees cross hundreds of kilometers in unseaworthy rubber dinghies or wooden fishing vessels with no navigation gear, life jackets, or food. High risk of capsizing, drowning, and hypothermia.",
    perspectiveNote: "Imagine being packed with 120 people on a deflating rubber raft in 3-meter waves at midnight, with engine fumes making passengers vomit and no rescue vessel in sight."
  },
  {
    id: "obs-med-libya-coast",
    title: "Libyan Coast Guard Interception Zone",
    category: "Enforcement & Detention",
    weight: 9,
    geometry: {
      type: "point",
      longitude: 13.5,
      latitude: 33.2
    },
    description: "Armed maritime patrols intercept vessels in international waters and forcibly return passengers to Libyan detention centers where abuse, torture, and forced labor are widely documented by the UN.",
    perspectiveNote: "Being pulled back means losing all savings, returning to arbitrary captivity in detention centers, and starting the trauma all over again."
  },
  {
    id: "obs-sahara-desert",
    title: "Sahara Desert Transit Corridor",
    category: "Environmental & Terrain",
    weight: 9,
    geometry: {
      type: "point",
      longitude: 13.0,
      latitude: 24.5
    },
    description: "Crossing vast expanses of the Sahara in pickup trucks. Extreme heat exceeding 45°C during the day and freezing nights. Breakdown or abandonment by smugglers often results in fatal dehydration.",
    perspectiveNote: "Thousands die undocumented in the desert sands before ever seeing the sea. Water runs out in hours if a vehicle breaks down."
  },
  {
    id: "obs-aegean-crossing",
    title: "Aegean Sea Crossing & Pushbacks",
    category: "Maritime Hazard",
    weight: 8,
    geometry: {
      type: "point",
      longitude: 26.5,
      latitude: 37.8
    },
    description: "Short but dangerous night crossing from Turkish shores to Greek islands (Lesvos, Samos, Chios) amid strong currents, overloaded rafts, and documented illegal pushbacks into Turkish waters.",
    perspectiveNote: "Fearing detection by thermal cameras, smugglers force passengers to jump into cold deep water meters away from rocky cliffs in darkness."
  },
  {
    id: "obs-evros-border",
    title: "Evros / Meriç River Militarized Border",
    category: "Border Enforcement",
    weight: 8,
    geometry: {
      type: "point",
      longitude: 26.4,
      latitude: 41.2
    },
    description: "The land border between Turkey and Greece features a 37-kilometer steel wall, razor wire, and a deep river with treacherous undertows. Heavily patrolled with night-vision systems and reported violent pushbacks.",
    perspectiveNote: "Refugees report being stripped of phones, money, and warm clothes before being forced back across the frigid river."
  },
  {
    id: "obs-balkan-mountains",
    title: "Balkan Route Forest & Mountain Passes",
    category: "Environmental & Terrain",
    weight: 7,
    geometry: {
      type: "point",
      longitude: 17.5,
      latitude: 44.2
    },
    description: "Traversing dense forests and rugged mountainous terrain in Bosnia and Herzegovina and Croatia. Sub-zero winter temperatures, unmarked minefields left from the 1990s wars, and steep ravines.",
    perspectiveNote: "Refugees sleep outdoors in makeshift tents with plastic tarps in freezing snow, suffering severe trench foot, frostbite, and animal attacks."
  },
  {
    id: "obs-hungary-fence",
    title: "Hungarian Border Double Razor-Wire Barrier",
    category: "Border Enforcement",
    weight: 9,
    geometry: {
      type: "point",
      longitude: 19.8,
      latitude: 46.1
    },
    description: "A 4-meter-high double fence along the Serbian border equipped with heat sensors, motion detectors, loudspeakers in multiple languages, and armed patrols with guard dogs.",
    perspectiveNote: "Fences do not stop people fleeing war; they only force them into the hands of organized smugglers who charge thousands of euros for dangerous hidden compartments."
  },
  {
    id: "obs-drina-river",
    title: "Drina River Crossing",
    category: "Environmental & Terrain",
    weight: 7,
    geometry: {
      type: "point",
      longitude: 19.2,
      latitude: 43.8
    },
    description: "Natural border river between Serbia and Bosnia with freezing, turbulent waters. Many non-swimmers drown attempting night crossings on inflatable mattresses or overloaded wooden boats.",
    perspectiveNote: "Refugees must swim across fast-flowing winter water with all their belongings in plastic bags tied around their necks."
  },
  {
    id: "obs-smuggler-extortion",
    title: "Smuggler Checkpoint & Debt Bondage",
    category: "Human Exploitation",
    weight: 8,
    geometry: {
      type: "point",
      longitude: 21.4,
      latitude: 39.8
    },
    description: "Clandestine hubs run by human trafficking networks where refugees are held hostage, subjected to ransom demands from families back home, or forced to surrender travel documents.",
    perspectiveNote: "Refugees are often trapped with no legal recourse, completely at the mercy of criminal networks because safe legal pathways do not exist."
  },
  {
    id: "obs-alps-winter",
    title: "Alpine Mountain Pass (Montgenèvre)",
    category: "Environmental & Terrain",
    weight: 8,
    geometry: {
      type: "point",
      longitude: 6.7,
      latitude: 44.9
    },
    description: "High mountain pass between Italy and France (elevation 1,850m). Deep winter snow, avalanches, and hypothermia threaten refugees navigating without winter footwear or mountain gear to evade police.",
    perspectiveNote: "Walking for 8 hours through waist-deep snow in worn-out sneakers to reach safety, risking amputation from severe frostbite."
  },
  {
    id: "obs-channel-straits",
    title: "Strait of Dover Sea Hazards",
    category: "Maritime Hazard",
    weight: 8,
    geometry: {
      type: "point",
      longitude: 1.6,
      latitude: 50.9
    },
    description: "One of the busiest maritime shipping lanes in the world. Dense container ship traffic, strong tidal currents, heavy fog, and near-freezing sea temperatures during night crossings.",
    perspectiveNote: "Tiny inflatable boats dodge massive 400-meter container ships whose wash can overturn small craft in seconds."
  },
  {
    id: "obs-water-scarcity",
    title: "Remote Corridor Water & Medical Deprivation",
    category: "Health & Survival",
    weight: 6,
    geometry: {
      type: "point",
      longitude: 24.1,
      latitude: 35.3
    },
    description: "Isolation along transit routes far from humanitarian aid. Extreme dehydration, untreated injuries, lack of insulin/chronic medications, and lack of sanitary facilities.",
    perspectiveNote: "Diabetic children and elderly grandmothers must walk dozens of kilometers daily without basic medicines or clean water."
  },
  {
    id: "obs-western-balkans-camp",
    title: "Overcrowded Transit Camp & Deprivation",
    category: "Enforcement & Detention",
    weight: 6,
    geometry: {
      type: "point",
      longitude: 16.3,
      latitude: 45.0
    },
    description: "Makeshift squatted camps and overcrowded facilities lacking electricity, running water, or sufficient food. Severe psychological toll and prolonged uncertainty.",
    perspectiveNote: "Months spent in bureaucratic limbo, trapped in mud and cold, waiting for a chance to attempt 'The Game' (crossing borders) again."
  },
  {
    id: "obs-morocco-melilla",
    title: "Melilla / Ceuta Land Enclave Barrier",
    category: "Border Enforcement",
    weight: 9,
    geometry: {
      type: "point",
      longitude: -2.9,
      latitude: 35.3
    },
    description: "Massive multi-tiered 6-meter-high fences with razor wire, tear gas dispersal systems, and heavy border guard deployments separating Morocco from Spanish enclaves.",
    perspectiveNote: "Desperate collective attempts to scale the fences have resulted in dozens of deaths and severe crush injuries."
  }
];

// Global window fallback
if (typeof window !== "undefined") {
  window.SAMPLE_OBSTACLES = SAMPLE_OBSTACLES;
}
