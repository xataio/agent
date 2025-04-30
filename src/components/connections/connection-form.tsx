'use client';

import { Button, Input, Label, toast, useForm } from '@xata.io/components';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { actionDeleteConnection, actionGetConnection, actionSaveConnection, validateConnection } from './actions';

type FormData = {
  name: string;
  connectionString: string;
};

type ConnectionFormProps = {
  projectId: string;
  id?: string;
};

export function ConnectionForm({ projectId, id }: ConnectionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: 'prod'
    }
  });
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function initializeForm() {
      if (id) {
        const connection = await actionGetConnection(id);
        if (connection) {
          reset({
            name: connection.name,
            connectionString: connection.connectionString
          });
        }
      }
    }
    void initializeForm();
  }, [reset, id]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    const result = await actionSaveConnection({
      projectId,
      id: id ?? null,
      name: data.name,
      connectionString: data.connectionString
    });
    setIsSaving(false);
    if (result.success) {
      toast(result.message);
      router.push(`/projects/${projectId}/start/connect`);
    } else {
      toast(result.message);
    }
  };

  const handleValidate = async (connectionString: string) => {
    if (!connectionString) {
      toast('Connection string is required');
      return;
    }
    setIsValidating(true);
    const result = await validateConnection(connectionString);
    setIsValidating(false);
    if (result.success) {
      toast(result.message);
    } else {
      toast(result.message);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await actionDeleteConnection(id);
      toast('Connection deleted successfully');
      router.push(`/projects/${projectId}/start/connect`);
    } catch (error) {
      toast('Failed to delete connection');
    }
  };

  return (
    <>
      <div>
        <p className="text-muted-foreground text-sm">
          {id ? 'Edit your database connection.' : "Let's start by setting up the connection to the Postgres database."}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Connection Name</Label>
          <Input id="name" {...register('name', { required: 'Connection name is required' })} className="mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="connectionString">Connection String</Label>
          <Input
            id="connectionString"
            {...register('connectionString', { required: 'Connection string is required' })}
            placeholder="postgres://user:pass@host:5432/dbname"
            className="mt-1"
          />
          {errors.connectionString && <p className="mt-1 text-sm text-red-500">{errors.connectionString.message}</p>}
        </div>
        <div className="flex space-x-4">
          {id && !showDeleteConfirm && (
            <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          )}
          {id && showDeleteConfirm && (
            <>
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Confirm Delete
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </>
          )}

          <Button type="button" onClick={() => handleValidate(watch('connectionString'))} disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate Connection'}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
}
