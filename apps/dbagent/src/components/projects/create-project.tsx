'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
  useForm
} from '@internal/components';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as z from 'zod';

const baseConnectionSchema = z.object({
  connectionString: z.string()
});

const awsConnectionSchema = baseConnectionSchema.extend({
  region: z.string().min(1, 'AWS region is required'),
  instanceIdentifier: z.string().min(1, 'Instance identifier is required')
});

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Project name must be at least 3 characters.'
  }),
  provider: z.string({
    required_error: 'Please select a database provider.'
  }),
  connection: z.union([baseConnectionSchema, awsConnectionSchema])
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProjectProps {
  provider: string;
  validateConnection: (connectionString: string) => Promise<{ success: boolean; message: string }>;
}

export function CreateProject({ provider, validateConnection }: CreateProjectProps) {
  const router = useRouter();

  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async (connectionString: string) => {
    setIsValidating(true);
    const result = await validateConnection(connectionString);
    setIsValidating(false);
    if (result.success) {
      toast(result.message);
    } else {
      toast(result.message);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      provider,
      connection: {
        connectionString: ''
      }
    }
  });

  const onSubmit = async (values: FormValues) => {
    console.log(values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    //onProjectCreated(values);
  };

  return (
    <div className="container mx-auto mt-8 py-10">
      <Button
        variant="ghost"
        onClick={() => {
          router.push('/projects');
        }}
        className="mb-4"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create a new Project</h1>
          <p className="text-muted-foreground mt-2">
            Please provide the necessary connection details for your selected database provider. .
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Database Project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {provider === 'aws-rds' ? (
                <>
                  <FormField
                    control={form.control}
                    name="connection.region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AWS Region</FormLabel>
                        <FormControl>
                          <Input placeholder="us-east-1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="connection.instanceIdentifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RDS Instance Identifier</FormLabel>
                        <FormControl>
                          <Input placeholder="my-rds-instance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
              <FormField
                control={form.control}
                name="connection.connectionString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection string</FormLabel>
                    <FormControl>
                      <Input placeholder="postgres://user:password@localhost:5432/mydatabase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Create Project</Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => handleValidate(form.watch('connection.connectionString'))}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Validate Connection'}
              </Button>{' '}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
