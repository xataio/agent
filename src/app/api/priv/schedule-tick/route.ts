import { checkAndRunJobsAsAdmin } from '~/lib/monitoring/scheduler';

export async function POST() {
  await checkAndRunJobsAsAdmin();
  return new Response('OK', { status: 200 });
}
