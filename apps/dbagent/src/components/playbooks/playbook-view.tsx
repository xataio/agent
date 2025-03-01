'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@internal/components';
import { ArrowLeft, Clock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Playbook } from '~/lib/tools/playbooks';

export function PlaybookView({ playbook }: { playbook: Playbook }) {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="items-left mb-6 flex justify-between">
        <Button variant="ghost" className="flex items-center pl-0" asChild>
          <a href="/playbooks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Playbooks
          </a>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Playbook:{playbook.name}</CardTitle>
          <CardDescription>
            <p className="text-muted-foreground">{playbook.description}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted whitespace-pre-wrap rounded-md p-4 text-sm">{playbook.content}</div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6">
          <Link href={`/monitoring/schedule/add?playbook=${playbook.name}`}>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Playbook
            </Button>
          </Link>
          <Link href={`/chats?playbook=${playbook.name}`}>
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
