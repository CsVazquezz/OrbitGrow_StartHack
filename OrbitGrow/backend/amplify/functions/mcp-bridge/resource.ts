import { defineFunction } from '@aws-amplify/backend';

export const mcpBridge = defineFunction({
  name: 'mcp-bridge',
  entry: './handler.ts',
  timeoutSeconds: 30, // Agents need fast responses usually
});
