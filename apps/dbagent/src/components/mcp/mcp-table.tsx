'use client';

import {
  Badge,
  Button,
  Code,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@internal/components';
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  PlayIcon,
  TestTubeIcon
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';
import {
  actionAddUserMcpServerToDB,
  actionCheckUserMcpServerExists,
  actionGetUserMcpServer,
  actionUpdateUserMcpServer
} from './action';

const ITEMS_PER_PAGE = 10;

interface TestRunResult {
  success: boolean;
  output: string;
  error: string;
  exitCode: number;
}

export function McpTable() {
  const router = useRouter();
  const [mcpServers, setMcpServers] = useState<UserMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mcpServerInDb, setmcpServerInDb] = useState<Record<string, boolean>>({});
  const { project } = useParams<{ project: string }>();
  const [currentPage, setCurrentPage] = useState(1);

  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  const loadMcpServers = async () => {
    try {
      //load mcp servers from their local folder(mcp-source)
      const response = await fetch('/api/mcp/servers');
      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }
      const servers = await response.json();

      //get enabled status from db
      for (const server of servers) {
        const getServerFromDb = await actionGetUserMcpServer(server.fileName);
        server.enabled = getServerFromDb?.enabled || false;
      }

      setMcpServers(servers);
      console.log('MCP SERVERS', servers);
      // Check if mcp servers are in db
      //used for the error and new badge
      const status: Record<string, boolean> = {};
      for (const server of servers) {
        status[server.fileName] = await actionCheckUserMcpServerExists(server.fileName);
      }
      setmcpServerInDb(status);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      setMcpServers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (targetMcpServer: UserMcpServer) => {
    setMcpServers((prevServers) =>
      prevServers.map((server) =>
        server.fileName === targetMcpServer.fileName ? { ...server, enabled: !server.enabled } : server
      )
    );
    targetMcpServer.enabled = !targetMcpServer.enabled;

    //adds mcp server to db if it doesn't exist
    //updates mcp servers enabled status in db otherwise
    const serverExists = await actionCheckUserMcpServerExists(targetMcpServer.fileName);
    if (!serverExists) {
      const addUserMcpServer = await actionAddUserMcpServerToDB(targetMcpServer);
      console.log('ADDED MCP SERVER', addUserMcpServer.enabled);
    } else {
      const updateUserMcpServer = await actionUpdateUserMcpServer(targetMcpServer);
      console.log('UPDATED MCP SERVER', updateUserMcpServer?.enabled);
    }
  };

  const handleTestRun = async (serverId: string) => {
    setIsTestRunning(true);
    setShowTestResults(true);
    setTestRunResult(null);

    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/test`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to run test');
      }
      const result = await response.json();
      setTestRunResult(result);
    } catch (error) {
      console.error('Error test running MCP server:', error);
      setTestRunResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to test run server',
        exitCode: 1
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  useEffect(() => {
    void loadMcpServers();
  }, [project]);

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  const getMcpServerUrl = (serverId: string) => {
    return `/projects/${project}/mcp/${encodeURIComponent(serverId)}`;
  };

  // Pagination math
  const totalPages = Math.ceil(mcpServers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentServers = mcpServers.slice(startIndex, endIndex);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {currentServers.map((server) => (
            <TableRow key={server.fileName}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Code variant="primary">
                    <Link href={getMcpServerUrl(server.fileName)}>{server.serverName}</Link>
                  </Code>
                  {!mcpServerInDb[server.fileName] && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>This MCP Server has not been added to the database yet</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{server.version}</TableCell>
              <TableCell>{server.filePath}</TableCell>
              <TableCell>
                <Switch checked={server.enabled} onCheckedChange={() => handleToggleEnabled(server)} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Test Run MCP server"
                    onClick={() => handleTestRun(server.fileName)}
                    disabled={isTestRunning}
                  >
                    <TestTubeIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Run MCP server"
                    onClick={() => router.push(`/projects/${project}/chats?mcp=${encodeURIComponent(server.fileName)}`)}
                  >
                    <PlayIcon className="h-3 w-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVerticalIcon className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(getMcpServerUrl(server.fileName))}>
                        <BookOpenIcon className="mr-2 h-3 w-3" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Test Run Results Dialog */}
      <Dialog open={showTestResults} onOpenChange={setShowTestResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Run Results</DialogTitle>
            <DialogDescription>
              {isTestRunning
                ? 'Running test...'
                : testRunResult?.success
                  ? 'Test run completed successfully'
                  : 'Test run failed'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {testRunResult?.output && (
              <div>
                <h4 className="font-medium">Output:</h4>
                <pre className="bg-muted mt-2 rounded p-2 text-sm">{testRunResult.output}</pre>
              </div>
            )}
            {testRunResult?.error && testRunResult.error !== 'No error output' && (
              <div>
                <h4 className="text-destructive font-medium">Error:</h4>
                <pre className="bg-destructive/10 text-destructive mt-2 rounded p-2 text-sm">{testRunResult.error}</pre>
              </div>
            )}
            {!isTestRunning && testRunResult && (
              <div className="text-muted-foreground text-sm">Exit Code: {testRunResult.exitCode}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {!isLoading && mcpServers.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, mcpServers.length)} of {mcpServers.length} servers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
