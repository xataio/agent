export async function register() {
  /* eslint-disable no-process-env */
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node.ts');
  }
}
