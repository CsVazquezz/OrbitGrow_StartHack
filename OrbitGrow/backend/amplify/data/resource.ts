import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates the OrbitGrow data models based on the PLAN.md.
These models represent the Martian Greenhouse Digital Twin.
=========================================================================*/
const schema = a.schema({
  // 1. Mission State (Singleton) - Tracks the global clock (Sol)
  Mission: a.model({
    currentSol: a.integer(), // e.g., 45
    phase: a.string(), // "nominal", "crisis", "recovery"
    lastUpdated: a.datetime(),
  }).authorization(allow => [allow.guest()]),

  // 2. Greenhouse Plots (The 20 physical growing zones)
  Plot: a.model({
    plotId: a.string().required(), // e.g. "ZONE-A-1"
    cropType: a.string(), // "potato", "beans", "lettuce", "radish", "herbs"
    plantedSol: a.integer(),
    harvestSol: a.integer(), // When it will be ready
    areaM2: a.float(),
    health: a.float(), // 0.0 - 1.0 (1.0 is perfect)
    stressFlags: a.string().array(), // ["water_stress", "pest_detected"]
  }).authorization(allow => [allow.guest()]),

  // 3. Environment State (Sensor readings per Sol)
  Environment: a.model({
    sol: a.integer().required(),
    // Internal Sensors
    temperature: a.float(), // Celsius
    humidity: a.float(), // %
    co2: a.float(), // ppm
    lightLevel: a.float(), // umol/m2/s
    waterEfficiency: a.float(), // % (0.0 - 1.0)
    energyUsage: a.float(), // % of budget
    // External Mars Conditions
    externalTemp: a.float(),
    dustStormIndex: a.float(), // 0.0 - 1.0
    radiationLevel: a.float(), // mSv/day
  }).authorization(allow => [allow.guest()]),

  // 4. Nutrition Ledger (Daily production stats)
  Nutrition: a.model({
    sol: a.integer().required(),
    caloriesProduced: a.float(),
    proteinProduced: a.float(),
    vitaminA: a.float(),
    vitaminC: a.float(),
    vitaminK: a.float(),
    folate: a.float(),
    coverageScore: a.float(), // 0 - 100 (The main KPI)
  }).authorization(allow => [allow.guest()]),

  // 5. Crew Member (Current health status of the 4 astronauts)
  CrewMember: a.model({
    role: a.string().required(), // "COMMANDER", "SCIENTIST", "ENGINEER", "PILOT"
    name: a.string(),
    healthScore: a.float(), // 0 - 100
    caloriesReceived: a.float(),
    proteinReceived: a.float(),
    deficitFlags: a.string().array(), // ["protein_low", "cal_deficit"]
  }).authorization(allow => [allow.guest()]),

  // 6. Sol Report (Timeline Log for UI & Audit)
  SolReport: a.model({
    sol: a.integer().required(),
    nutritionScore: a.float(),
    agentDecisions: a.json().array(), // Stores the AI reasoning JSON objects
    activeCrises: a.string().array(), // ["WATER_FAIL", "DUST_STORM"]
  }).authorization(allow => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
