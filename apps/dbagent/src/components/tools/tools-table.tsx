'use client';

import {
  Button,
  Code,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@xata.io/components';
import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, MoreVerticalIcon, PlayIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/schema';
import { Tool, actionGetBuiltInAndCustomTools, actionGetConnections } from './action';

const ITEMS_PER_PAGE = 10;

export function ToolsTable() {
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { project } = useParams<{ project: string }>();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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

      const tools = await actionGetBuiltInAndCustomTools(defaultConnection.id);
      setTools(tools);
    } catch (error) {
      console.error('Error loading tools:', error);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (connections.length > 0) {
      void loadTools();
    }
  }, [connections]);

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  const getToolUrl = (toolName: string) => {
    return `/projects/${project}/tools/${encodeURIComponent(toolName)}`;
  };

  //pagination math
  const totalPages = Math.ceil(tools.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTools = tools.slice(startIndex, endIndex);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tools</h1>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
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
          {currentTools.map((tool) => (
            <TableRow key={`${tool.isBuiltIn}-${tool.name}`}>
              <TableCell>
                <Code variant="default">
                  <Link href={getToolUrl(tool.name)}>{tool.name}</Link>
                </Code>
              </TableCell>
              <TableCell className="whitespace-nowrap">{tool.isBuiltIn ? 'Built-in' : 'Custom'}</TableCell>
              <TableCell>{tool.description}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Run tool"
                    onClick={() => router.push(`/projects/${project}/chats/new?tool=${tool.name}`)}
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
                      <DropdownMenuItem onClick={() => router.push(getToolUrl(tool.name))}>
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

      {/* pagination */}
      {!isLoading && tools.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, tools.length)} of {tools.length} tools
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
