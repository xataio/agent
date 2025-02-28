'use server';

import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';

export default async function Page() {
  const connections = await listConnections();

  return (
    <div className="container">
      <ChatsUI connections={connections} />
    </div>
  );
}
