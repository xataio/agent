import { checkAndRunJobs } from '~/lib/services/scheduler';

export async function POST() {
  await checkAndRunJobs();
  return new Response('OK', { status: 200 });
}
