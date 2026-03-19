import { defineFunction } from '@aws-amplify/backend';

export const runSol = defineFunction({
  name: 'run-sol',
  entry: './handler.ts',
  timeoutSeconds: 60, // Give enough time for simulation calculations
});
