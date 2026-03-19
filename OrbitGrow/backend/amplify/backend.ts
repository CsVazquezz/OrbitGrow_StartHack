import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
// import { runSol } from './functions/run-sol/resource'; // Phase 2: Simulation Engine
// import { mcpBridge } from './functions/mcp-bridge/resource'; // Phase 3: MCP Bridge

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  // runSol,
  // mcpBridge,
});

/* 
// --- Phase 2 & 3: Function Permissions ---
// Grant the runSol function permission to read/write all data models
const { tables } = backend.data.resources;

// List all models defined in data/resource.ts
const models = [
  'Mission',
  'Plot',
  'Environment',
  'Nutrition',
  'CrewMember',
  'SolReport'
];

// Grant access to each table
for (const model of models) {
  if (tables[model]) {
    tables[model].grantReadWriteData(backend.runSol.resources.lambda);
    tables[model].grantReadWriteData(backend.mcpBridge.resources.lambda);
  }
}
*/
