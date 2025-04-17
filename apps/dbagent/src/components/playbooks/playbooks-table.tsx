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
import { BookOpenIcon, ClockIcon, CopyIcon, MoreVerticalIcon, PencilIcon, PlayIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CustomPlaybook } from '~/lib/tools/custom-playbooks';
import { Playbook, getBuiltInPlaybooks } from '~/lib/tools/playbooks';
import { actionGetCustomPlaybooks } from './action';

export function PlaybooksTable() {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [customPlaybooks, setCustomPlaybooks] = useState<CustomPlaybook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { project } = useParams<{ project: string }>();

  const loadPlaybooks = async () => {
    setIsLoading(true);
    try {
      const playbooks = getBuiltInPlaybooks();
      const customPlaybooks = await actionGetCustomPlaybooks(project);
      setPlaybooks(playbooks);
      setCustomPlaybooks(customPlaybooks);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBuiltInPlaybook = (playBookName: string) => {
    router.push(`/projects/${project}/playbooks/new?playbookName=${playBookName}&copyCount=0`);
  };

  const handleCopyCustomPlaybook = (customPlaybookId: string) => {
    router.push(`/projects/${project}/playbooks/new?customPlaybookId=${customPlaybookId}&copyCount=0`);
  };

  useEffect(() => {
    void loadPlaybooks();
  }, []);

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Playbooks</h1>
        <Button title="Create Custom Playbook" onClick={() => router.push(`/projects/${project}/playbooks/new`)}>
          Create Custom Playbook
        </Button>
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
          {playbooks.map((playbook) => (
            <TableRow key={`built-in-${playbook.name}`}>
              <TableCell>
                <Code variant="default">
                  <Link href={`/projects/${project}/playbooks/${playbook.name}`}>{playbook.name}</Link>
                </Code>
              </TableCell>
              <TableCell>{playbook.isBuiltIn ? 'Built-in' : 'Custom'}</TableCell>
              <TableCell>{playbook.description}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Run playbook"
                    onClick={() => router.push(`/projects/${project}/chats/new?playbook=${playbook.name}`)}
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
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project}/playbooks/${playbook.name}`)}>
                        <BookOpenIcon className="mr-2 h-3 w-3" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/projects/${project}/monitoring/schedule/add?playbook=${playbook.name}`)
                        }
                      >
                        <ClockIcon className="mr-2 h-3 w-3" />
                        Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyBuiltInPlaybook(playbook.name)}>
                        <CopyIcon className="mr-2 h-3 w-3" />
                        Copy Playbook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {customPlaybooks.map((customPlaybook) => (
            <TableRow key={`custom-${customPlaybook.id}`}>
              <TableCell>
                <Code variant="default">
                  <Link href={`/projects/${project}/playbooks/${customPlaybook.id}`}>{customPlaybook.name}</Link>
                </Code>
              </TableCell>
              <TableCell>{customPlaybook.isBuiltIn ? 'Built-in' : 'Custom'}</TableCell>
              <TableCell>{customPlaybook.description}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Run playbook"
                    onClick={() => router.push(`/projects/${project}/chats/new?playbook=${customPlaybook.name}`)}
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/projects/${project}/playbooks/${customPlaybook.id}`)}
                      >
                        <BookOpenIcon className="mr-2 h-3 w-3" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/projects/${project}/monitoring/schedule/add?playbook=${customPlaybook.name}`)
                        }
                      >
                        <ClockIcon className="mr-2 h-3 w-3" />
                        Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/projects/${project}/playbooks/${customPlaybook.id}/edit`)}
                      >
                        <PencilIcon className="mr-2 h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyCustomPlaybook(customPlaybook.id)}>
                        <CopyIcon className="mr-2 h-3 w-3" />
                        Copy Playbook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
