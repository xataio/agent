import { notFound } from 'next/navigation';
import { McpView } from '~/components/mcp/mcp-view';
import { findServerOnDisk } from '~/lib/db/mcp-servers';

type PageParams = {
  project: string;
  server: string;
};

export default async function McpServerPage({ params }: { params: Promise<PageParams> }) {
  const { server: serverId } = await params;

  const server = await findServerOnDisk(serverId);
  if (!server) {
    notFound();
  }

  return (
    <div className="container">
      <McpView server={server} />
    </div>
  );
}
