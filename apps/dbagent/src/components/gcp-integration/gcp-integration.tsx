'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast
} from '@internal/components';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/connections';
import { CloudSQLInstanceInfo } from '~/lib/gcp/cloudsql';
import { fetchCloudSQLInstances, getGCPIntegration, processGCPCredentialsFile } from './actions';
import { DatabaseConnectionSelector } from './db-instance-connector';
import { FileUpload } from './file-upload';
import { CloudSQLInstanceCard } from './gcp-instance-card';

export function GCPIntegration({ projectId, connections }: { projectId: string; connections: Connection[] }) {
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [cloudSQLInstances, setCloudSQLInstances] = useState<CloudSQLInstanceInfo[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [instanceDetails, setInstanceDetails] = useState<CloudSQLInstanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMethod, setInputMethod] = useState<'file' | 'manual'>('file');

  useEffect(() => {
    const loadGCPIntegration = async () => {
      const response = await getGCPIntegration(projectId);
      if (response.success && response.data) {
        setClientEmail(response.data.clientEmail);
        setPrivateKey(response.data.privateKey);
        setGcpProjectId(response.data.gcpProjectId);
        // If we have existing data, default to manual input
        setInputMethod('manual');
      }
    };
    void loadGCPIntegration();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetchCloudSQLInstances(projectId, gcpProjectId, clientEmail, privateKey);
      if (response.success) {
        if (response.data.length === 0) {
          toast('No Cloud SQL instances found');
        } else {
          setCloudSQLInstances(response.data);
          toast('Cloud SQL instances fetched successfully');
        }
      } else {
        toast(`Error: Failed to fetch Cloud SQL instances. ${response.message || ''}`);
      }
    } catch (error) {
      toast('Error: Failed to fetch Cloud SQL instances. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (fileContents: string) => {
    setIsLoading(true);
    try {
      const response = await processGCPCredentialsFile(projectId, fileContents);
      if (response.success && response.data) {
        setGcpProjectId(response.data.gcpProjectId);
        setClientEmail(response.data.clientEmail);
        setPrivateKey(response.data.privateKey);
        toast('GCP credentials processed successfully');

        // Automatically fetch instances after credentials are processed
        const instancesResponse = await fetchCloudSQLInstances(
          projectId,
          response.data.gcpProjectId,
          response.data.clientEmail,
          response.data.privateKey
        );

        if (instancesResponse.success) {
          if (instancesResponse.data.length === 0) {
            toast('No Cloud SQL instances found');
          } else {
            setCloudSQLInstances(instancesResponse.data);
            toast('Cloud SQL instances fetched successfully');
          }
        } else {
          toast(`Error: Failed to fetch Cloud SQL instances. ${instancesResponse.message || ''}`);
        }
      } else {
        toast(`Error: ${response.message}`);
      }
    } catch (error) {
      toast('Error: Failed to process GCP credentials file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstanceSelect = async (instanceId: string) => {
    const instance = cloudSQLInstances.find((instance) => instance.id === instanceId);
    if (!instance) {
      toast('Error: Selected instance not found');
      return;
    }
    console.log('Selected instance', instance);
    setSelectedInstance(instance.id);
    setInstanceDetails(instance);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GCP Integration</CardTitle>
        <CardDescription>Configure your GCP integration and select a Cloud SQL instance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Create a service account</AlertTitle>
            <AlertDescription>
              To obtain the Service Account Client Email and Private Key,{' '}
              <Link href="#" target="_blank" className="font-medium underline">
                follow this guide
              </Link>
              .
            </AlertDescription>
          </Alert>
        </div>

        <Tabs
          value={inputMethod}
          onValueChange={(val: string) => setInputMethod(val as 'file' | 'manual')}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload Credentials File</TabsTrigger>
            <TabsTrigger value="manual">Enter Credentials Manually</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : (
              <FileUpload onFileLoaded={handleFileUpload} onError={(message) => toast(`Error: ${message}`)} />
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="gcpProjectId">GCP Project ID</Label>
                <Input
                  id="gcpProjectId"
                  value={gcpProjectId}
                  onChange={(e) => setGcpProjectId(e.target.value)}
                  placeholder="my-project-id"
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Service Account Client Email</Label>
                <Input
                  id="clientEmail"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="project-name@project-id.iam.gserviceaccount.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="privateKey">Private Key</Label>
                <Textarea
                  id="privateKey"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  className="font-mono text-xs"
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Cloud SQL Instances
                  </>
                ) : (
                  'Fetch Cloud SQL Instances'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {cloudSQLInstances.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold">Select a Cloud SQL Instance</h3>
            <Select value={selectedInstance} onValueChange={handleInstanceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Cloud SQL instance" />
              </SelectTrigger>
              <SelectContent>
                {cloudSQLInstances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {instanceDetails && (
          <div>
            <CloudSQLInstanceCard instanceInfo={instanceDetails} />
            <DatabaseConnectionSelector
              projectId={projectId}
              instanceName={instanceDetails.name}
              gcpProjectId={gcpProjectId}
              connections={connections}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
