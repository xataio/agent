'use server';

import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';

async function getConnections() {
  const connections = await listConnections();
  return connections;
}

export default async function Page() {
  const connections = await getConnections();

  return (
    <div className="container">
      <ChatsUI connections={connections} />
    </div>
  );
}
