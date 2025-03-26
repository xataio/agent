'use client';

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Textarea } from '@internal/components';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Playbook } from '~/lib/tools/playbooks';
import { actionCreatePlaybook, actionUpdatePlaybook } from './action';

interface CustomPlaybookFormProps {
  initialData?: Playbook;
  isEditing?: boolean;
}

export function CustomPlaybookForm({ initialData, isEditing = false }: CustomPlaybookFormProps) {
  const { project } = useParams<{ project: string }>();
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEditing && initialData) {
        await actionUpdatePlaybook(initialData.name, {
          description,
          content
        });
      } else {
        await actionCreatePlaybook({
          name,
          description,
          content,
          projectId: project,
          id: crypto.randomUUID(),
          isBuiltIn: false
        });
      }

      router.push(`/projects/${project}/playbooks`);
    } catch (err) {
      console.error('Error saving playbook:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the playbook');
    } finally {
      setLoading(false);
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
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Playbook' : 'Create New Playbook'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border-destructive text-destructive rounded-md border p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                className="w-full rounded-md border p-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEditing}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <input
                id="description"
                className="w-full rounded-md border p-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Playbook Content
              </label>
              <Textarea
                id="content"
                className="min-h-[300px] font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">
                Write your playbook with clear steps and instructions for the AI agent to follow.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-6">
            <Button variant="outline" type="button" onClick={() => router.push(`/projects/${project}/playbooks`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Playbook' : 'Create Playbook'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
