'use client';

import { Button, Input, Label, Textarea } from '@internal/components';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

type FormData = {
  name: string;
  cronExpression: string;
  playbook: string;
  description: string;
  database: string;
  enabled: boolean;
};

export function ScheduleForm({ action, scheduleId }: { action: string; scheduleId: string }) {
  const router = useRouter();
  const isEditMode = action !== 'add';

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      name: '',
      cronExpression: '',
      playbook: '',
      description: '',
      database: 'Prod',
      enabled: true
    }
  });

  useEffect(() => {
    if (isEditMode) {
      // TODO: Fetch schedule data from API or database
      // For now, we'll just simulate fetching data
      reset({
        name: 'Example Schedule',
        cronExpression: '0 * * * *',
        playbook: 'Check API Status',
        description: 'Hourly check of API endpoints',
        database: 'Prod',
        enabled: true
      });
    }
  }, [isEditMode, reset]);

  const onSubmit = async (data: FormData) => {
    // TODO: Save schedule to API or database
    console.log('Saving schedule:', data);
    router.push('/monitoring');
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-2xl font-bold">{isEditMode ? 'Edit Schedule' : 'Add New Schedule'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Schedule Name</Label>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Schedule name is required' }}
            render={({ field, fieldState: { error } }) => (
              <>
                <Input {...field} id="name" />
                {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
              </>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cronExpression">Cron Expression</Label>
          <Controller
            name="cronExpression"
            control={control}
            rules={{ required: 'Cron expression is required' }}
            render={({ field, fieldState: { error } }) => (
              <>
                <Input {...field} id="cronExpression" />
                {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
              </>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="playbook">Playbook</Label>
          <Controller
            name="playbook"
            control={control}
            rules={{ required: 'Playbook is required' }}
            render={({ field, fieldState: { error } }) => (
              <>
                <Input {...field} id="playbook" />
                {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
              </>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Textarea {...field} id="description" rows={3} />}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="database">Database</Label>
          <Controller
            name="database"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="database"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Prod">Prod</option>
                <option value="Staging">Staging</option>
                <option value="Test">Test</option>
              </select>
            )}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="enabled"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
          />
          <Label htmlFor="enabled">Enabled</Label>
        </div>
        <div className="flex space-x-4">
          <Button type="submit">{isEditMode ? 'Update Schedule' : 'Create Schedule'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push('/monitoring-schedule')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
