import path, { join } from 'path';
const __dirname = path.resolve();

const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: join(__dirname, '../../')
    }
  }
};

export default config;
