import { REQUIRED_VARIABLES } from './constants';

export const validateEnvFile = (function() {
  const missingVariables = REQUIRED_VARIABLES.filter(variable => !process.env[variable]);
  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }
})();
