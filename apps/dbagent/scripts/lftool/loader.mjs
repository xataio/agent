import { dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return {
      shortCircuit: true,
      url: `file://${resolvePath(__dirname, './mocks/empty.ts')}`
    };
  }

  return nextResolve(specifier);
}
