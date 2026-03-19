import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

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
        clearCredentialsAndIdentityId: () => {},
      },
    },
  }
);

const client = generateClient<Schema>();

export const handler = async (event: any) => {
  console.log('--- MCP REQUEST RECEIVED ---');
  console.log('Event:', JSON.stringify(event, null, 2));

  // Determine tool/action from payload
  // Trying multiple common patterns: Body JSON, query params, or direct Lambda invoke
  let tool = event.tool || event.action || (event.body ? JSON.parse(event.body).tool : null);
  let args = event.args || event.arguments || (event.body ? JSON.parse(event.body).args : {});

  if (!tool) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing "tool" or "action" in request' }),
    };
  }

  try {
    let result;

    switch (tool) {
      case 'get_mission_status':
        const { data: missions } = await client.models.Mission.list();
        result = missions[0] || { status: 'No Mission Found' };
        break;

      case 'get_environment':
        // Get latest environment reading
        // Since we don't have easy sort in Gen 2 list without index, we might need a specific query
        // For now, listing all and taking last (inefficient but works for prototype)
        // Better: Query by Sol if known, or add GSI
        const { data: envs } = await client.models.Environment.list();
        // Sort by sol descending
        result = envs.sort((a, b) => b.sol - a.sol)[0] || { status: 'No Environment Data' };
        break;

      case 'inspect_plots':
        const { data: plots } = await client.models.Plot.list();
        result = plots;
        break;

      case 'plant_crop':
        // args: { plotId: "ZONE-A-1", cropType: "potato" }
        // Find plot by plotId (which is a field, not necessarily ID)
        // Since we don't have GSI on plotId yet, we list and find. 
        // Ideally schema should make plotId the primary key or secondary index.
        const { data: allPlots } = await client.models.Plot.list();
        const targetPlot = allPlots.find(p => p.plotId === args.plotId);
        
        if (targetPlot) {
          const { data: updatedPlot } = await client.models.Plot.update({
            id: targetPlot.id,
            cropType: args.cropType,
            plantedSol: args.currentSol || 0, // Should come from mission status ideally
            health: 1.0,
            stressFlags: [],
          });
          result = updatedPlot;
        } else {
          throw new Error(`Plot ${args.plotId} not found`);
        }
        break;
        
      case 'harvest_crop':
         // args: { plotId: "ZONE-A-1" }
         const { data: hPlots } = await client.models.Plot.list();
         const hTarget = hPlots.find(p => p.plotId === args.plotId);
         if (hTarget) {
             // Reset plot
             const { data: clearedPlot } = await client.models.Plot.update({
                 id: hTarget.id,
                 cropType: null,
                 plantedSol: null,
                 health: null,
                 stressFlags: [],
             });
             result = clearedPlot;
         } else {
             throw new Error(`Plot ${args.plotId} not found`);
         }
         break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown tool: ${tool}` }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, tool, result }),
    };

  } catch (error) {
    console.error(`Error executing tool ${tool}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
    };
  }
};
