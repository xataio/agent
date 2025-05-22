'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@xata.io/components';
import { ArrowLeft, PlayCircle, PlusIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { actionGetConnections, actionGetCustomToolsFromMCPServer } from '~/components/tools/action';
import { Connection, MCPServerInsert } from '~/lib/db/schema';
import { actionCheckUserMcpServerExists, actionUpdateUserMcpServer } from './action';

interface Tool {
  name: string;
  description: string;
  isBuiltIn: boolean;
}

export function McpView({ server: initialServer }: { server: MCPServerInsert }) {
  const { project } = useParams<{ project: string }>();
  const [server, setServer] = useState<MCPServerInsert>(initialServer);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInDb, setIsInDb] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [envVars, setEnvVars] = useState<Record<string, string>>(initialServer.envVars || {});
  const [isSavingEnvVars, setIsSavingEnvVars] = useState(false);

  useEffect(() => {
    setServer(initialServer);
    setEnvVars(initialServer.envVars || {});
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

  const handleAddEnvVar = () => {
    setEnvVars({ ...envVars, '': '' });
  };

  const handleEnvVarChange = (index: number, key: string, value: string) => {
    const entries = Object.entries(envVars);
    const oldKey = entries[index]?.[0];
    const newEntries = entries.filter(([k]) => k !== oldKey);
    newEntries.splice(index, 0, [key, value]);
    setEnvVars(Object.fromEntries(newEntries));
  };

  const handleRemoveEnvVar = (keyToRemove: string) => {
    const newEnvVars = { ...envVars };
    delete newEnvVars[keyToRemove];
    setEnvVars(newEnvVars);
  };

  const handleSaveEnvVars = async () => {
    setIsSavingEnvVars(true);
    try {
      if (!isInDb) {
        toast.error('Cannot save environment variables. Please enable the server first to add it to the database.');
        setIsSavingEnvVars(false);
        return;
      }

      const varsToSave = Object.fromEntries(Object.entries(envVars).filter(([key]) => key.trim() !== ''));
      const updatedServerData = { ...server, envVars: varsToSave };
      await actionUpdateUserMcpServer(updatedServerData);
      setServer(updatedServerData);
      setEnvVars(varsToSave);
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
          <CardTitle>MCP Server: {server.serverName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">File Path</h3>
            <p className="text-muted-foreground">{server.filePath}</p>
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

          {isInDb && (
            <div>
              <h3 className="font-semibold">Environment Variables</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                These variables will be passed to the MCP server process.
              </p>
              <div className="space-y-3">
                {Object.entries(envVars).map(([key, value], index) => (
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
      </Card>
    </main>
  );
}
