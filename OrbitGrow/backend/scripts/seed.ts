import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json' assert { type: 'json' };

// --- Configure Amplify for Node.js ---
Amplify.configure(outputs);

const client = generateClient<Schema>();

async function seed() {
  console.log('🌱 Starting Seed Process...');

  try {
    // 1. Create Mission (Singleton)
    console.log('Creating Mission State...');
    const { data: mission, errors: missionErr } = await client.models.Mission.create({
      currentSol: 0,
      phase: 'nominal',
      lastUpdated: new Date().toISOString(),
    });

    if (missionErr) throw new Error(JSON.stringify(missionErr));
    console.log(`✅ Mission Created: Sol ${mission?.currentSol}`);

    // 2. Create 20 Greenhouse Plots
    console.log('Planting 20 Greenhouse Plots...');
    const crops = ['potato', 'potato', 'potato', 'potato', 'potato', 'potato', 'potato', 'potato', 'potato', 
                   'beans', 'beans', 'beans', 'beans', 'beans',
                   'lettuce', 'lettuce', 'lettuce', 'lettuce',
                   'radish', 'herbs'];
    
    for (let i = 0; i < 20; i++) {
      const zoneId = `ZONE-${String.fromCharCode(65 + Math.floor(i/5))}-${(i % 5) + 1}`; // ZONE-A-1, ZONE-B-1...
      
      const { errors: plotErr } = await client.models.Plot.create({
        plotId: zoneId,
        cropType: crops[i],
        plantedSol: 0,
        harvestSol: 30 + Math.floor(Math.random() * 20), // random harvest time
        areaM2: 5.0,
        health: 1.0,
        stressFlags: [],
      });
      if (plotErr) console.error(`Failed to plant plot ${zoneId}`, plotErr);
    }
    console.log('✅ 20 Plots Planted.');

    // 3. Create Crew Members
    console.log('Assigning Crew...');
    const roles = ['COMMANDER', 'SCIENTIST', 'ENGINEER', 'PILOT'];
    const names = ['Cmdr. Lewis', 'Dr. Watney', 'Eng. Beck', 'Plt. Martinez'];

    for (let i = 0; i < 4; i++) {
      await client.models.CrewMember.create({
        role: roles[i],
        name: names[i],
        healthScore: 100.0,
        caloriesReceived: 3000,
        proteinReceived: 90,
        deficitFlags: [],
      });
    }
    console.log('✅ Crew Onboarded.');

    console.log('🎉 Seed Complete! The Greenhouse is alive.');
    
  } catch (error) {
    console.error('❌ Seed Failed:', error);
  }
}

seed();
