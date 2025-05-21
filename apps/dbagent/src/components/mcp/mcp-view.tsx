'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@xata.io/components';
import { ArrowLeft, PlayCircle, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { actionGetConnections, actionGetCustomToolsFromMCPServer } from '~/components/tools/action';
import { Connection, McpServerConfig, MCPServerInsert } from '~/lib/db/schema';
import {
  actionAddUserMcpServerToDB,
  actionCheckUserMcpServerExists,
  actionDeleteUserMcpServerFromDBAndFiles,
  actionUpdateUserMcpServer
} from './action';

interface Tool {
  name: string;
  description: string;
  isBuiltIn: boolean;
}

export function McpView({ server: initialServer }: { server: MCPServerInsert }) {
  const { project } = useParams<{ project: string }>();
  const router = useRouter();
  const [server, setServer] = useState<MCPServerInsert>(initialServer);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isInDb, setIsInDb] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [config, setConfig] = useState<McpServerConfig>(initialServer.config);
  const [isSavingEnvVars, setIsSavingEnvVars] = useState(false);

  useEffect(() => {
    setServer(initialServer);
    setConfig(initialServer.config);
  }, [initialServer]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [connectionsData, serverExists] = await Promise.all([
          actionGetConnections(project),
          actionCheckUserMcpServerExists(server.name)
        ]);

        setIsInDb(serverExists);

        const defaultConnection = connectionsData.find((c: Connection) => c.isDefault);
        if (defaultConnection) {
          if (serverExists || server.enabled) {
            const tools = await actionGetCustomToolsFromMCPServer(server.name);
            setTools(tools);
          } else {
            setTools([]);
          }
        }
        setError(null);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
        setIsCheckingDb(false);
      }
    };
    void loadData();
  }, [project, server.name, server.enabled]);

  const handleDeleteServer = async () => {
    try {
      await actionDeleteUserMcpServerFromDBAndFiles(server.name);
      router.push(`/projects/${project}/mcp`);
    } catch (error) {
      console.error('Error deleting server:', error);
      setError('Failed to delete server. Please try again later.');
    }
  };

  const handleAddEnvVar = () => {
    if (config.type !== 'local') return;

    setConfig({ ...config, env: { ...config.env, '': '' } });
  };

  const handleEnvVarChange = (index: number, key: string, value: string) => {
    if (config.type !== 'local') return;

    const entries = Object.entries(config.env ?? {});
    const oldKey = entries[index]?.[0];
    const newEntries = entries.filter(([k]) => k !== oldKey);
    newEntries.splice(index, 0, [key, value]);
    setConfig({ ...config, env: Object.fromEntries(newEntries) });
  };

  const handleRemoveEnvVar = (keyToRemove: string) => {
    if (config.type !== 'local') return;

    const newConfig = { ...config };
    delete newConfig.env?.[keyToRemove];
    setConfig(newConfig);
  };

  const handleSaveEnvVars = async () => {
    if (config.type !== 'local') return;

    setIsSavingEnvVars(true);
    try {
      if (!isInDb) {
        toast.error('Cannot save environment variables. Please enable the server first to add it to the database.');
        setIsSavingEnvVars(false);
        return;
      }

      const varsToSave = Object.fromEntries(Object.entries(config.env ?? {}).filter(([key]) => key.trim() !== ''));
      const updatedServerData = { ...server, envVars: varsToSave };
      await actionUpdateUserMcpServer(updatedServerData);
      setServer(updatedServerData);
      setConfig({ ...config, env: varsToSave });
      toast.success('Environment variables saved successfully.');
    } catch (error) {
      console.error('Error saving environment variables:', error);
      toast.error('Failed to save environment variables.');
    } finally {
      setIsSavingEnvVars(false);
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
          <CardTitle>MCP Server: {server.name}</CardTitle>
          <CardDescription>
            <p className="text-muted-foreground">Version: {server.version}</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Type</h3>
            <p className="text-muted-foreground">{server.config.type}</p>
          </div>
          <div>
            <h3 className="font-semibold">Status</h3>
            <p className="text-muted-foreground">
              {isCheckingDb ? (
                <span className="text-muted-foreground">Checking status...</span>
              ) : !isInDb ? (
                <span className="text-yellow-600">Not enabled</span>
              ) : server.enabled ? (
                'Enabled'
              ) : (
                'Disabled'
              )}
            </p>
          </div>

          {isInDb && config.type === 'local' && (
            <div>
              <h3 className="font-semibold">Environment Variables</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                These variables will be passed to the MCP server process.
              </p>
              <div className="space-y-3">
                {Object.entries(config.env ?? {}).map(([key, value], index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Variable Name"
                      value={key}
                      onChange={(e) => handleEnvVarChange(index, e.target.value, value)}
                      className="flex-1"
                      disabled={isSavingEnvVars}
                    />
                    <Input
                      placeholder="Variable Value"
                      value={value}
                      onChange={(e) => handleEnvVarChange(index, key, e.target.value)}
                      className="flex-1"
                      disabled={isSavingEnvVars}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEnvVar(key)}
                      disabled={isSavingEnvVars}
                      aria-label="Remove variable"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddEnvVar} disabled={isSavingEnvVars}>
                  <PlusIcon className="mr-2 h-4 w-4" /> Add Variable
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveEnvVars} disabled={isSavingEnvVars || !isInDb}>
                  {isSavingEnvVars ? 'Saving...' : 'Save Environment Variables'}
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder for a general Save Server button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={async () => {
                try {
                  let payload = { ...server };

                  // Validate required fields
                  if (!payload.name || !payload.version || !payload.config.type) {
                    toast.error('Name, Server Name, File Path, Version, and Type are required.');
                    return;
                  }

                  if (!initialServer.id && !isInDb) {
                    // CREATE MODE
                    // Check if server with this name already exists (client-side check before calling action)
                    // The actionAddUserMcpServerToDB also checks, but this is a quicker feedback
                    const exists = await actionCheckUserMcpServerExists(payload.name);
                    if (exists) {
                      toast.error(`Server with identifier (name) "${payload.name}" already exists.`);
                      return;
                    }
                    const newServer = await actionAddUserMcpServerToDB(payload);
                    toast.success('Server created successfully!');
                    // Update isInDb and potentially initialServer to reflect creation
                    setIsInDb(true);
                    // It's better to navigate to the edit view of the new server or refresh.
                    // For now, just update local state and initialServer to allow further edits as if it's an edit page.
                    // This might need router.push(`/projects/${project}/mcp/${newServer.name}`) for a full SPA feel.
                    setServer(newServer); // Update local state with returned server (includes ID, defaults, etc.)
                    // To prevent re-triggering create mode if user clicks save again:
                    // This depends on how `initialServer` is managed by the parent of McpView
                    // A robust solution would involve navigating or the parent component refreshing `initialServer`.
                    // For now, we assume `setServer` with the new server (which has an ID) is enough for subsequent saves to be updates.
                    // A proper "create" page would likely redirect.
                    if (newServer.id) {
                      // Simulate that it's now an existing server for subsequent saves
                      initialServer.id = newServer.id;
                      initialServer.name = newServer.name; // ensure name is also updated if it was somehow different
                    }
                  } else {
                    // UPDATE MODE
                    await actionUpdateUserMcpServer(payload);
                    toast.success('Server updated successfully!');
                  }
                  // Optionally re-fetch or update local state if needed for parent components
                } catch (error) {
                  console.error('Error saving server:', error);
                  toast.error(`Failed to save server: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              disabled={isCheckingDb || isSavingEnvVars}
            >
              {!initialServer.id && !isInDb ? 'Create Server' : 'Save Server Changes'}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold">Available Tools</h3>
            {isLoading ? (
              <p className="text-muted-foreground">Loading tools...</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
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
                      {server.enabled ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${project}/chats/new?tool=${tool.name}`}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Run
                          </Link>
                        </Button>
                      ) : (
                        <div className="inline-block">
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="outline" size="sm" disabled>
                                <div className="flex items-center">
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Run
                                </div>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Enable the server to run this tool</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
