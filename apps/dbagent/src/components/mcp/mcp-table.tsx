'use client';

import {
  Badge,
  Button,
  Code,
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
} from '@xata.io/components';
import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, MoreVerticalIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MCPServer } from '~/lib/db/schema';
import {
  actionAddUserMcpServerToDB,
  actionCheckUserMcpServerExists,
  actionGetUserMcpServer,
  actionUpdateUserMcpServer
} from './action';

const ITEMS_PER_PAGE = 10;

export function McpTable() {
  const router = useRouter();
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mcpServerInDb, setmcpServerInDb] = useState<Record<string, boolean>>({});
  const { project } = useParams<{ project: string }>();
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(false);

  const loadMcpServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers');

      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }

      const servers = await response.json();
      const status: Record<string, boolean> = {};

      await Promise.all(
        servers.map(async (server: MCPServer) => {
          const [getServerFromDb, exists] = await Promise.all([
            actionGetUserMcpServer(server.name),
            actionCheckUserMcpServerExists(server.name)
          ]);
          server.enabled = getServerFromDb?.enabled || false;
          status[server.name] = exists;
        })
      );

      setMcpServers(servers);
      setmcpServerInDb(status);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      setMcpServers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (targetMcpServer: MCPServer) => {
    setMcpServers((prevServers) =>
      prevServers.map((server) =>
        server.name === targetMcpServer.name ? { ...server, enabled: !server.enabled } : server
      )
    );
    targetMcpServer.enabled = !targetMcpServer.enabled;

    const serverExists = await actionCheckUserMcpServerExists(targetMcpServer.name);
    if (!serverExists) {
      await actionAddUserMcpServerToDB(targetMcpServer);
      setmcpServerInDb((prev) => ({
        ...prev,
        [targetMcpServer.name]: true
      }));
    } else {
      await actionUpdateUserMcpServer(targetMcpServer);
    }
  };

  useEffect(() => {
    void loadMcpServers();
  }, [project]);

  useEffect(() => {
    setIsAddButtonDisabled(false);
  }, []);

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-12 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  const getMcpServerUrl = (server: MCPServer) => {
    return `/projects/${project}/mcp/${encodeURIComponent(server.name)}`;
  };

  const totalPages = Math.ceil(mcpServers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentServers = mcpServers.slice(startIndex, endIndex);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
        <Button onClick={() => router.push(`/projects/${project}/mcp/create`)} disabled={isAddButtonDisabled}>
          Add MCP Server
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sever Name</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>URL</TableHead>
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
            <TableRow key={server.name}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Code variant="default">
                    <Link href={getMcpServerUrl(server)}>{server.serverName}</Link>
                  </Code>
                  {!mcpServerInDb[server.name] && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>This MCP Server has not been enabled yet</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>{server.filePath}</TableCell>
              <TableCell>
                <Badge variant={server.type === 'stdio' ? 'outline' : 'default'}>
                  {server.type}
                </Badge>
              </TableCell>
              <TableCell>
                {server.url ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Link
                        href={server.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline"
                        style={{ maxWidth: '150px', display: 'inline-block' }}
                      >
                        {server.url}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{server.url}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <Switch checked={server.enabled} onCheckedChange={() => handleToggleEnabled(server)} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVerticalIcon className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(getMcpServerUrl(server))}>
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
