'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xata.io/components';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Tool } from './action';

export function ToolView({ tool }: { tool: Tool }) {
  const { project } = useParams<{ project: string }>();

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="items-left mb-6 flex justify-between">
        <Button variant="ghost" className="flex items-center pl-0" asChild>
          <Link href={`/projects/${project}/tools`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tools
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tool: {tool.name}</CardTitle>
          <CardDescription>
            <p className="text-muted-foreground">{tool.description}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted prose prose-sm whitespace-pre-wrap rounded-md p-4">{tool.description}</div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6">
          <Link href={`/projects/${project}/chats/new?tool=${tool.name}`}>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Tool
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
