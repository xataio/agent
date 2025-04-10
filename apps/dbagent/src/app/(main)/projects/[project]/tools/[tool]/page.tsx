import { notFound } from 'next/navigation';
import { actionGetBuiltInTools } from '~/components/tools/action';
import { ToolView } from '~/components/tools/tool-view';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
  tool: string;
};

export default async function ToolPage({ params }: { params: Promise<PageParams> }) {
  const { project, tool: toolName } = await params;

  // Decode the URL-encoded tool name
  const decodedToolName = decodeURIComponent(toolName);

  // Get the default connection for the project
  const connections = await listConnections(project);
  const defaultConnection = connections.find((c) => c.isDefault);
  if (!defaultConnection) {
    throw new Error('No default connection found');
  }

  // Get all tools
  const tools = await actionGetBuiltInTools(defaultConnection.id);
  const tool = tools.find((t) => t.name === decodedToolName);

  if (!tool) {
    console.log(`Tool not found: ${decodedToolName}`); // Add logging for debugging
    notFound();
  }

  return (
    <div className="container">
      <ToolView
        tool={{
          name: tool.name,
          description: tool.description,
          isBuiltIn: tool.isBuiltIn,
          enabled: tool.enabled
        }}
      />
    </div>
  );
}
