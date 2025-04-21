'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@internal/components';
import { ArrowLeft, PlayCircle, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { actionGetConnections, actionGetCustomTools } from '~/components/tools/action';
import { Connection } from '~/lib/db/schema';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';
import { actionDeleteUserMcpServerFromDBAndFiles } from './action';

interface Tool {
  name: string;
  description: string;
  isBuiltIn: boolean;
}

export function McpView({ server }: { server: UserMcpServer }) {
  const { project } = useParams<{ project: string }>();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const data = await actionGetConnections(project);
        setConnections(data);
      } catch (error) {
        console.error('Error loading connections:', error);
      }
    };
    void loadConnections();
  }, [project]);

  const loadTools = async () => {
    setIsLoading(true);
    try {
      const defaultConnection = connections.find((c: Connection) => c.isDefault);
      if (!defaultConnection) {
        throw new Error('No default connection found');
      }

      const tools = await actionGetCustomTools(defaultConnection.id);
      setTools(tools);
      setError(null);
    } catch (error) {
      console.error('Error loading tools:', error);
      setTools([]);
      setError('Failed to load tools. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (connections.length > 0) {
      void loadTools();
    }
  }, [connections]);

  const handleDeleteServer = async () => {
    try {
      await actionDeleteUserMcpServerFromDBAndFiles(server.fileName);
      router.push(`/projects/${project}/mcp`);
    } catch (error) {
      console.error('Error deleting server:', error);
      setError('Failed to delete server. Please try again later.');
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="items-left mb-6 flex justify-between">
        <Button variant="ghost" className="flex items-center pl-0" asChild>
          <Link href={`/projects/${project}/mcp`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to MCP Servers
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>MCP Server: {server.serverName}</CardTitle>
          <CardDescription>
            <p className="text-muted-foreground">Version: {server.version}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">File Path</h3>
              <p className="text-muted-foreground">{server.filePath}</p>
            </div>
            <div>
              <h3 className="font-semibold">Status</h3>
              <p className="text-muted-foreground">{server.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Available Tools</h3>
              {isLoading ? (
                <p className="text-muted-foreground">Loading tools...</p>
              ) : error ? (
                <p className="text-destructive">{error}</p>
              ) : !server.enabled ? (
                <p className="text-muted-foreground">Enable the server to view available tools</p>
              ) : tools.length === 0 ? (
                <p className="text-muted-foreground">No tools available</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {tools.map((tool) => (
                    <Card key={tool.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{tool.name}</h4>
                          <p className="text-muted-foreground text-sm">{tool.description}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${project}/chats/new?tool=${tool.name}`}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Run
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6">
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete Server
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDeleteServer}>
                Confirm Delete
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel Delete
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
