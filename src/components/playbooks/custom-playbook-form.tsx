'use client';

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Textarea } from '@xata.io/components';
import { ArrowLeft, TrashIcon, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Playbook } from '~/lib/tools/playbooks';
import { generateUUID } from '../chat/utils';
import {
  actionCreatePlaybook,
  actionDeletePlaybook,
  actionGeneratePlaybookContent,
  actionGetCustomPlaybook,
  actionGetSchedulesByUserIdAndProjectId,
  actionUpdatePlaybook
} from './action';

interface CustomPlaybookFormProps {
  initialData?: Playbook & { id?: string };
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
  const [generating, setGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEditing && initialData?.id) {
        await actionUpdatePlaybook(initialData.id, {
          description,
          content
        });
      } else {
        await actionCreatePlaybook({
          name: name.trim(),
          description,
          content,
          projectId: project,
          id: generateUUID(),
          isBuiltIn: false,
          createdBy: ''
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

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setLoading(true);
    setError(null);
    try {
      //check if the playbook is being used for monitoring by checking if a schedule exists for the playbook
      //if it does, do not delete the playbook
      //if it does not, delete the playbook
      const playbookToDelete = await actionGetCustomPlaybook(project, initialData.id);
      const schedules = await actionGetSchedulesByUserIdAndProjectId(playbookToDelete.createdBy, project);
      const doesScheduleExistForCustomPlaybook = schedules.find(
        (schedule) => schedule.playbook === playbookToDelete.name
      );

      if (!doesScheduleExistForCustomPlaybook) {
        await actionDeletePlaybook(initialData.id);
        router.push(`/projects/${project}/playbooks`);
      } else {
        setError('This playbook cannot be deleted because it is currently in use for monitoring');
      }
    } catch (err) {
      console.error('Error deleting playbook:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the playbook');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!name || !description) {
      setError('Please fill in both name and description before generating content');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const generatedContent = await actionGeneratePlaybookContent(name, description);
      setContent(generatedContent);
    } catch (err) {
      console.error('Error generating content:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate playbook content');
    } finally {
      setGenerating(false);
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
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title={
                    !name && !description
                      ? 'Please fill in both name and description'
                      : !name
                        ? 'Please fill in the name'
                        : !description
                          ? 'Please fill in the description'
                          : 'Generate playbook content'
                  }
                  onClick={() => {
                    if (!name && !description) {
                      setError('Please fill in both name and description before generating content');
                    } else if (!name) {
                      setError('Please fill in the name before generating content');
                    } else if (!description) {
                      setError('Please fill in the description before generating content');
                    } else {
                      void handleGenerateContent();
                    }
                  }}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generating ? 'Generating...' : 'Generate Content'}
                </Button>
              </div>
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
            {isEditing && (
              <>
                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                      Confirm Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={loading}
                    >
                      Cancel Delete
                    </Button>
                  </>
                )}
              </>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Playbook' : 'Create Playbook'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
