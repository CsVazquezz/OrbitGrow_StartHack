import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize Amplify for the Lambda environment
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
        region: process.env.AWS_REGION,
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            sessionToken: process.env.AWS_SESSION_TOKEN || '',
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* No-op: Lambda execution environment is ephemeral */
        },
      },
    },
  }
);

const client = generateClient<Schema>();

// --- SIMULATION CONSTANTS & HELPERS ---

const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Optimal Ranges (Simplified from PLAN.md)
const OPTIMAL = {
  temp: { min: 18, max: 26 },
  humidity: { min: 55, max: 75 },
  co2: { min: 900, max: 1500 },
  light: { min: 350, max: 450 },
};

export const handler = async (event: any) => {
  console.log('--- START SOL SIMULATION ---');
  
  try {
    // 1. Fetch Current Mission State
    const { data: missions } = await client.models.Mission.list();
    let mission = missions[0];

    // Initialize if fresh start
    if (!mission) {
      console.log('Initializing Mission State...');
      const { data: newMission } = await client.models.Mission.create({
        currentSol: 0,
        phase: 'nominal',
        lastUpdated: new Date().toISOString(),
      });
      mission = newMission!;
      
      // Seed 20 plots if empty
      // (This would be a separate initialization step ideally, but good for self-healing)
    }

    const currentSol = mission.currentSol! + 1;
    console.log(`Advancing to Sol ${currentSol}`);

    // 2. Calculate Environment (Drift Logic)
    // External Mars Conditions
    const externalTemp = clamp(-60 + randomFloat(-5, 5), -125, 20);
    const dustStormIndex = clamp(0.0 + randomFloat(-0.05, 0.1), 0, 1);
    const radiationLevel = clamp(0.3 + randomFloat(-0.05, 0.05), 0.1, 0.7);

    // Internal Sensor Drift
    // Dust storm reduces light
    const lightReduction = dustStormIndex > 0.5 ? 200 : 0; 
    
    const envData = {
      sol: currentSol,
      temperature: clamp(22 + randomFloat(-1.5, 1.5), 10, 35),
      humidity: clamp(65 + randomFloat(-3, 3), 30, 95),
      co2: clamp(1200 + randomFloat(-80, 80), 400, 2000),
      lightLevel: clamp(400 - lightReduction + randomFloat(-20, 20), 200, 600),
      waterEfficiency: clamp(0.92 + randomFloat(-0.015, 0.015), 0.5, 0.99),
      energyUsage: clamp(0.60 + randomFloat(-0.02, 0.02), 0.3, 1.0),
      // External
      externalTemp,
      dustStormIndex,
      radiationLevel,
    };

    // Save Environment State
    await client.models.Environment.create(envData);
    console.log('Environment Updated:', envData);

    // 3. Process Plots (Growth Logic)
    const { data: plots } = await client.models.Plot.list();
    
    // Check for stress conditions
    const isTempStress = envData.temperature < OPTIMAL.temp.min || envData.temperature > OPTIMAL.temp.max;
    const isWaterStress = envData.waterEfficiency < 0.85;

    for (const plot of plots) {
      // Calculate new health
      let health = plot.health || 1.0;
      let stressFlags = plot.stressFlags ? [...plot.stressFlags] : [];

      if (isTempStress) {
        health -= 0.05;
        if (!stressFlags.includes('temp_stress')) stressFlags.push('temp_stress');
      } else {
        // Recovery
        health = Math.min(health + 0.02, 1.0);
        stressFlags = stressFlags.filter(f => f !== 'temp_stress');
      }

      if (isWaterStress) {
        health -= 0.1;
        if (!stressFlags.includes('water_stress')) stressFlags.push('water_stress');
      }

      health = clamp(health, 0, 1.0);

      // Update Plot
      await client.models.Plot.update({
        plotId: plot.plotId, // Using the required primary key or identifier
        // Update other fields
        id: plot.id, // Needed for update
        health,
        stressFlags: stressFlags.filter(Boolean) as string[], // Ensure no nulls
      });
    }
    console.log(`Processed ${plots.length} plots.`);

    // 4. Update Mission Clock
    await client.models.Mission.update({
      id: mission.id,
      currentSol,
      lastUpdated: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Sol Advanced Successfully',
        sol: currentSol,
        environment: envData
      }),
    };

  } catch (error) {
    console.error('Error running simulation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Simulation failed', details: String(error) }),
    };
  }
};
