'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  zodResolver
} from '@internal/components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { DbConnection } from '~/lib/db/connections';
import { Schedule } from '~/lib/db/schedules';
import { ModelSelector } from '../chats/model-selector';
import { actionCreateSchedule, actionDeleteSchedule, actionGetSchedule, actionUpdateSchedule } from './actions';
import { CronExpressionModal } from './cron-expression-modal';

const formSchema = z.object({
  playbook: z.string().min(1, { message: 'Please select a playbook' }),
  connection: z.number().positive({ message: 'Please select a connection' }),
  model: z.string().min(1, { message: 'Please select a model' }),
  scheduleType: z.enum(['automatic', 'cron']),
  minInterval: z.string().optional(),
  maxInterval: z.string().optional(),
  cronExpression: z.string().optional(),
  additionalInstructions: z.string().optional(),
  enabled: z.boolean()
});

export function ScheduleForm({
  isEditMode,
  scheduleId,
  playbooks,
  connections
}: {
  isEditMode: boolean;
  scheduleId: number;
  playbooks: string[];
  connections: DbConnection[];
  connection?: string;
}) {
  const router = useRouter();
  const [showCronModal, setShowCronModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playbook: playbooks[0] || '',
      connection: connections.find((c) => c.isDefault)?.id || -1,
      model: 'openai-gpt-4o',
      scheduleType: 'cron',
      minInterval: '5',
      maxInterval: '1440',
      cronExpression: '0 * * * *',
      additionalInstructions: '',
      enabled: true
    }
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchSchedule = async () => {
        const schedule = await actionGetSchedule(scheduleId);
        form.reset({
          playbook: schedule.playbook,
          connection: connections.find((c) => c.id === Number(schedule.connectionId))?.id || -1,
          model: schedule.model || 'openai-gpt-4o',
          scheduleType: schedule.scheduleType as 'automatic' | 'cron',
          cronExpression: schedule.cronExpression ?? undefined,
          minInterval: schedule.minInterval?.toString(),
          maxInterval: schedule.maxInterval?.toString(),
          additionalInstructions: schedule.additionalInstructions ?? undefined,
          enabled: schedule.enabled
        });
      };
      void fetchSchedule();
    }
  }, [isEditMode, form.reset, scheduleId]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const schedule: Schedule = {
      id: scheduleId,
      connectionId: connections.find((c) => c.id === data.connection)?.id || -1,
      model: data.model,
      playbook: data.playbook,
      scheduleType: data.scheduleType,
      cronExpression: data.cronExpression,
      additionalInstructions: data.additionalInstructions,
      minInterval: Number(data.minInterval),
      maxInterval: Number(data.maxInterval),
      enabled: data.enabled,
      status: data.enabled ? 'scheduled' : 'disabled'
    };
    if (isEditMode) {
      await actionUpdateSchedule(schedule);
    } else {
      await actionCreateSchedule(schedule);
    }
    console.log(data);
    router.push('/monitoring');
  };

  const handleDelete = async () => {
    await actionDeleteSchedule(scheduleId);
    router.push('/monitoring');
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit monitoring schedule' : 'Add new monitoring schedule'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="connection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a database" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {connections.map((connection) => (
                          <SelectItem key={connection.id} value={String(connection.id)}>
                            {connection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="playbook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playbook</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a playbook" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {playbooks.map((playbook) => (
                          <SelectItem key={playbook} value={playbook}>
                            {playbook}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <ModelSelector value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Schedule Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="cron" />
                            </FormControl>
                            <FormLabel className="font-normal">Cron Expression</FormLabel>
                          </FormItem>
                          <FormControl>
                            <RadioGroupItem value="automatic" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Automatic/Dynamic (let the agent decide the next run)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('scheduleType') === 'automatic' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Interval (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Interval (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {form.watch('scheduleType') === 'cron' && (
                <FormField
                  control={form.control}
                  name="cronExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <div className="w-full">
                            <Input {...field} />
                          </div>
                          <Button type="button" variant="outline" onClick={() => setShowCronModal(true)}>
                            Generate with AI
                          </Button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="additionalInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Instructions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter any additional instructions here..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enabled</FormLabel>
                      <FormDescription>Turn on or off the monitoring job schedule</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="mr-2">
                {isEditMode ? 'Update Schedule' : 'Create Schedule'}
              </Button>
              {isEditMode && (
                <>
                  {!showDeleteConfirm ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="mr-2"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="destructive" className="mr-2" onClick={handleDelete}>
                        Confirm Delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="mr-2"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel Delete
                      </Button>
                    </>
                  )}
                </>
              )}
              <Link href="/monitoring">
                <Button variant="outline">Cancel</Button>
              </Link>
            </form>

            <CronExpressionModal
              isOpen={showCronModal}
              onClose={() => setShowCronModal(false)}
              onGenerate={(expression) => {
                form.setValue('cronExpression', expression);
                setShowCronModal(false);
              }}
            />
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
