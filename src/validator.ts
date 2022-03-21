import { REQUIRED_VARIABLES } from './constants';

export const validateEnvFile = () => { 
  const missingVariables = Object.keys(REQUIRED_VARIABLES).filter(variable => !process.env[variable]);
  if (missingVariables.length > 0) {
    missingVariables.forEach(variable => {
      if (REQUIRED_VARIABLES[variable].default) {
        process.env[variable] = REQUIRED_VARIABLES[variable].default;
      } else {
        throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
      }
    });
  }
  const invalidVariables = Object.keys(REQUIRED_VARIABLES).filter(variable => {
    console.log(`${variable} = ${process.env[variable]}`);
    console.log(`${variable} type = ${REQUIRED_VARIABLES[variable].type}`);
    if (REQUIRED_VARIABLES[variable].type === 'number') {
      return isNaN(Number(process.env[variable]));
    }
    return typeof process.env[variable] !== REQUIRED_VARIABLES[variable].type;
  });
  if (invalidVariables.length > 0) {
    throw new Error(`Invalid environment variables: ${invalidVariables.join(', ')}`);
  }
};
