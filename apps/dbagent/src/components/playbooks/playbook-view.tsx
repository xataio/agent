'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xata.io/components';
import { ArrowLeft, Clock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Playbook } from '~/lib/tools/playbooks';

export function PlaybookView({ playbook }: { playbook: Playbook }) {
  const { project } = useParams<{ project: string }>();

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
          <CardTitle>Playbook:{playbook.name}</CardTitle>
          <CardDescription>{playbook.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted prose prose-sm whitespace-pre-wrap rounded-md p-4">{playbook.content}</div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6">
          <Link href={`/projects/${project}/monitoring/schedule/add?playbook=${playbook.name}`}>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Playbook
            </Button>
          </Link>
          <Link href={`/projects/${project}/chats/new?playbook=${playbook.name}`}>
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
