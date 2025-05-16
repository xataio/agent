import { config } from '@dotenvx/dotenvx';

// Load environment variables first
config({
  path: ['.env', '.env.local'],
  strict: false,
  ignore: ['MISSING_ENV_FILE']
});
