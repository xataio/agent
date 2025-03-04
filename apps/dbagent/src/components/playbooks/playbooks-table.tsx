'use client';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@internal/components';
import { BookOpenIcon, ClockIcon, PlayIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Playbook } from '~/lib/tools/playbooks';
import { actionGetPlaybooks } from './action';

export function PlaybooksTable() {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { project } = useParams<{ project: string }>();

  const loadPlaybooks = async () => {
    setIsLoading(true);
    try {
      const playbooks = await actionGetPlaybooks();
      setPlaybooks(playbooks);
    } finally {
      setIsLoading(false);
    }
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
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
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
            <TableRow key={playbook.name}>
              <TableCell>
                <Link href={`/projects/${project}/playbooks/${playbook.name}`}>{playbook.name}</Link>
              </TableCell>
              <TableCell>{playbook.description}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="View playbook details"
                    onClick={() => router.push(`/projects/${project}/playbooks/${playbook.name}`)}
                  >
                    <BookOpenIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Run playbook"
                    onClick={() => router.push(`/projects/${project}/chats?playbook=${playbook.name}`)}
                  >
                    <PlayIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Schedule playbook"
                    onClick={() =>
                      router.push(`/projects/${project}/monitoring/schedule/add?playbook=${playbook.name}`)
                    }
                  >
                    <ClockIcon className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
