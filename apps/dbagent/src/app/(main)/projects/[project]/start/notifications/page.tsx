'use server';

import { SlackIntegration } from '~/components/slack-integration/slack-integration';

export default async function Page() {
  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <SlackIntegration />
    </div>
  );
}
