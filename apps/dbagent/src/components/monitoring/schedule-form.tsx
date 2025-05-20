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
  useForm,
  zodResolver
} from '@xata.io/components';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as z from 'zod';
import { Connection, Schedule } from '~/lib/db/schema';
import { actionGetDefaultLanguageModel } from '../chat/actions';
import { ModelSelector } from '../chat/model-selector';
import { actionCreateSchedule, actionDeleteSchedule, actionGetSchedule, actionUpdateSchedule } from './actions';
import { CronExpressionModal } from './cron-expression-modal';

const formSchema = z.object({
  playbook: z.string().min(1, { message: 'Please select a playbook' }),
  connection: z.string().min(1, { message: 'Please select a connection' }),
  model: z.string().min(1, { message: 'Please select a model' }),
  scheduleType: z.enum(['automatic', 'cron']),
  minInterval: z.string().optional(),
  maxInterval: z.string().optional(),
  cronExpression: z.string().optional(),
  additionalInstructions: z.string().optional(),
  maxSteps: z.string().optional(),
  notifyLevel: z.enum(['info', 'warning', 'alert']),
  extraNotificationText: z.string().optional(),
  enabled: z.boolean()
});

type ScheduleFormEditParams =
  | {
      isEditMode: true;
      scheduleId: string;
    }
  | {
      isEditMode: false;
      scheduleId?: never;
    };

type ScheduleFormParams = {
  projectId: string;
  playbooks: string[];
  connections: Connection[];
} & ScheduleFormEditParams;

export function ScheduleForm({ projectId, isEditMode, scheduleId, playbooks, connections }: ScheduleFormParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCronModal, setShowCronModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const playbook = searchParams.get('playbook');

  const [defaultModel, setDefaultModel] = useState<{ id: string; name: string }>();
  useEffect(() => {
    void actionGetDefaultLanguageModel().then((model) => {
      setDefaultModel(model);
      form.setValue('model', model.id);
    });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playbook: playbook || playbooks[0] || '',
      connection: connections.find((c) => c.isDefault)?.name || '',
      model: defaultModel?.id || 'chat',
      scheduleType: 'cron',
      minInterval: '5',
      maxInterval: '1440',
      cronExpression: '0 * * * *',
      additionalInstructions: '',
      maxSteps: '0',
      notifyLevel: 'alert',
      extraNotificationText: '',
      enabled: true
    }
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchSchedule = async () => {
        const schedule = await actionGetSchedule(scheduleId);

        form.reset({
          playbook: schedule.playbook,
          connection: connections.find((c) => c.id === schedule.connectionId)?.name || '',
          model: schedule.model,
          scheduleType: schedule.scheduleType as 'automatic' | 'cron',
          cronExpression: schedule.cronExpression ?? undefined,
          minInterval: schedule.minInterval?.toString(),
          maxInterval: schedule.maxInterval?.toString(),
          additionalInstructions: schedule.additionalInstructions ?? undefined,
          maxSteps: schedule.maxSteps?.toString() || '0',
          notifyLevel: schedule.notifyLevel || 'alert',
          extraNotificationText: schedule.extraNotificationText ?? undefined,
          enabled: schedule.enabled
        });
      };
      void fetchSchedule();
    }
  }, [isEditMode, form.reset, scheduleId, defaultModel]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const schedule: Omit<Schedule, 'id' | 'userId'> = {
      projectId,
      connectionId: connections.find((c) => c.name === data.connection)?.id.toString() || '',
      model: data.model,
      playbook: data.playbook,
      scheduleType: data.scheduleType,
      cronExpression: data.cronExpression ?? null,
      additionalInstructions: data.additionalInstructions ?? null,
      minInterval: Number(data.minInterval),
      maxInterval: Number(data.maxInterval),
      maxSteps: Number(data.maxSteps),
      notifyLevel: data.notifyLevel,
      extraNotificationText: data.extraNotificationText ?? null,
      enabled: data.enabled,
      keepHistory: 300,
      status: data.enabled ? 'scheduled' : 'disabled',
      lastRun: null,
      nextRun: data.enabled ? new Date(Date.now() + 1000 * 60 * Number(data.minInterval)).toISOString() : null,
      failures: 0
    };
    if (isEditMode) {
      await actionUpdateSchedule({ ...schedule, id: scheduleId });
    } else {
      await actionCreateSchedule(schedule);
    }

    router.push(`/projects/${projectId}/monitoring`);
  };

  const handleDelete = async () => {
    if (!scheduleId) return;

    await actionDeleteSchedule(scheduleId);
    router.push(`/projects/${projectId}/monitoring`);
  };

  return (
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
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a database" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connections.map((connection) => (
                        <SelectItem key={connection.name} value={connection.name}>
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
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                <FormItem className="flex flex-col space-y-2">
                  <FormLabel className="block">Model</FormLabel>
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
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
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
              name="maxSteps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Steps</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    The model can decide to run other playbooks (of its choice) in order to drill down during the
                    investigation. This parameter controls how many times it can chain new playbook calls. Set to 0 to
                    disable, in which case only the given playbook is executed.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select notification level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>At which level should the schedule trigger a notification.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="extraNotificationText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra Notification Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional extra text for notifications..." {...field} />
                  </FormControl>
                  <FormDescription>
                    An optional extra text to include with the notification. On Slack this can be used to ping
                    particular people or groups.
                  </FormDescription>
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
            <Link href={`/projects/${projectId}/monitoring`}>
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
  );
}
