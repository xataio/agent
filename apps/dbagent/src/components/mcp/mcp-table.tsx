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
} from '@internal/components';
import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, MoreVerticalIcon } from 'lucide-react';
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

export function McpTable() {
  const router = useRouter();
  const [mcpServers, setMcpServers] = useState<UserMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mcpServerInDb, setmcpServerInDb] = useState<Record<string, boolean>>({});
  const { project } = useParams<{ project: string }>();
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(false);

  const loadMcpServers = async () => {
    try {
      //load mcp servers from their local folder(mcp-source)
      const response = await fetch('/api/mcp/servers');

      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }

      const servers = await response.json();
      const status: Record<string, boolean> = {};

      await Promise.all(
        servers.map(async (server: UserMcpServer) => {
          const [getServerFromDb, exists] = await Promise.all([
            //used to get enabled status from db
            actionGetUserMcpServer(server.fileName),
            //used to check if mcp servers are in db
            actionCheckUserMcpServerExists(server.fileName)
          ]);
          server.enabled = getServerFromDb?.enabled || false;
          status[server.fileName] = exists;
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
      await actionAddUserMcpServerToDB(targetMcpServer);
      //updates the mcpServerInDb state to show that the server is added to the database
      setmcpServerInDb((prev) => ({
        ...prev,
        [targetMcpServer.fileName]: true
      }));
    } else {
      await actionUpdateUserMcpServer(targetMcpServer);
    }
  };

  useEffect(() => {
    void loadMcpServers();
  }, [project]);

  //used to disable the Add MCP Server button (SET THIS TO FALSE LATER BEFORE DEPLOYING)
  useEffect(() => {
    setIsAddButtonDisabled(false);
  }, []);

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

  //sort servers to show new ones first [this may not be needed later on]
  //(oldcode) const currentServers = mcpServers.slice(startIndex, endIndex);
  const sortedServers = [...mcpServers].sort((a, b) => {
    const aIsNew = !mcpServerInDb[a.fileName];
    const bIsNew = !mcpServerInDb[b.fileName];
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    return 0;
  });

  const currentServers = sortedServers.slice(startIndex, endIndex);

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
                      <TooltipContent>This MCP Server has not been enabled yet</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>{server.filePath}</TableCell>
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
