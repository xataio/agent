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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CronExpressionModal } from './cron-expression-modal';

type FormData = {
  playbook: string;
  cronExpression: string;
  additionalDetails: string;
  database: string;
  description: string;
  enabled: boolean;
};

const formSchema = z.object({
  playbook: z.string().min(1, { message: 'Please select a playbook' }),
  scheduleType: z.enum(['automatic', 'cron']),
  minInterval: z.string().optional(),
  maxInterval: z.string().optional(),
  cronExpression: z.string().optional(),
  additionalInstructions: z.string().optional(),
  enabled: z.boolean()
});

export function ScheduleForm({ scheduleId, playbooks }: { scheduleId: string; playbooks: string[] }) {
  //const router = useRouter();
  const [showCronModal, setShowCronModal] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playbook: '',
      scheduleType: 'cron',
      minInterval: '',
      maxInterval: '',
      cronExpression: '',
      additionalInstructions: '',
      enabled: true
    }
  });
  const isEditMode = scheduleId !== 'add';

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      cronExpression: '0 5 * * *',
      playbook: playbooks[0] || '',
      additionalDetails: '',
      database: 'Prod',
      description: '',
      enabled: true
    }
  });

  useEffect(() => {
    if (isEditMode) {
      // TODO: Fetch schedule data from API or database
      // For now, we'll just simulate fetching data
      reset({
        cronExpression: '0 5 * * *',
        playbook: playbooks[0] || '',
        additionalDetails: '',
        database: 'Prod',
        description: '',
        enabled: true
      });
    }
  }, [isEditMode, reset]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log(data);
    // Here you would typically send the data to your backend
    alert('Form submitted! Check console for data.');
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
                name="scheduleType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Schedule Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                          <Input {...field} />
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

              <Button type="submit">Create Schedule</Button>
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
