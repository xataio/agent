'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@internal/components';
import { ArrowLeft, Clock, Edit, PlayCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Playbook } from '~/lib/tools/playbooks';

//not being used so far

interface CustomPlaybookViewProps {
  playbook: Playbook;
  onDelete?: (playbookName: string) => Promise<void>;
}

export function CustomPlaybookView({ playbook, onDelete }: CustomPlaybookViewProps) {
  const { project } = useParams<{ project: string }>();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(playbook.name);
      router.push(`/projects/${project}/playbooks`);
    } catch (error) {
      console.error('Error deleting playbook:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="items-left mb-6 flex justify-between">
        <Button variant="ghost" className="flex items-center pl-0" asChild>
          <Link href={`/projects/${project}/playbooks`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Playbooks
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Playbook: {playbook.name}</CardTitle>
              <CardDescription>
                <p className="text-muted-foreground">{playbook.description}</p>
              </CardDescription>
            </div>
            {!playbook.isBuiltIn && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => router.push(`/projects/${project}/playbooks/${playbook.name}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  onClick={handleDelete}
                  disabled={isDeleting || !onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted whitespace-pre-wrap rounded-md p-4 text-sm">{playbook.content}</div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6">
          <Link href={`/projects/${project}/monitoring/schedule/add?playbook=${playbook.name}`}>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Playbook
            </Button>
          </Link>
          <Link href={`/projects/${project}/chats?playbook=${playbook.name}`}>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Playbook
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
