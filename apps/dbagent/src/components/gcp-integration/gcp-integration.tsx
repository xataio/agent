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
  Textarea,
  toast
} from '@internal/components';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/connections';
import { CloudSQLInstanceInfo } from '~/lib/gcp/cloudsql';
import {
  CloudSQLInstanceDetailedInfo,
  fetchCloudSQLInstanceDetails,
  fetchCloudSQLInstances,
  getGCPIntegration
} from './actions';

export function GCPIntegration({ projectId, connections }: { projectId: string; connections: Connection[] }) {
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [cloudSQLInstances, setCloudSQLInstances] = useState<CloudSQLInstanceInfo[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [instanceDetails, setInstanceDetails] = useState<CloudSQLInstanceDetailedInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadGCPIntegration = async () => {
      const response = await getGCPIntegration(projectId);
      if (response.success && response.data) {
        setClientEmail(response.data.clientEmail);
        setPrivateKey(response.data.privateKey);
        setGcpProjectId(response.data.gcpProjectId);
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

  const handleInstanceSelect = async (instanceId: string) => {
    const instance = cloudSQLInstances.find((instance) => instance.id === instanceId);
    if (!instance) {
      toast('Error: Selected instance not found');
      return;
    }
    setSelectedInstance(instance.id);
    try {
      const details = await fetchCloudSQLInstanceDetails(projectId, instance);
      setInstanceDetails(details.data);
    } catch (error) {
      toast('Error: Failed to fetch Cloud SQL instance details.');
    }
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
          <div className="mt-8">
            <CloudSQLInstanceCard instanceInfo={instanceDetails} />
            <DatabaseConnectionSelector
              _instanceId={instanceDetails.id}
              _region={instanceDetails.region}
              _connections={connections}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component to display Cloud SQL instance details
function CloudSQLInstanceCard({ instanceInfo }: { instanceInfo: CloudSQLInstanceDetailedInfo }) {
  return (
    <div className="border-border mb-6 rounded-lg border p-4">
      <h3 className="mb-2 text-lg font-semibold">{instanceInfo.name}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-sm">ID</p>
          <p className="font-mono text-sm">{instanceInfo.id}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Region</p>
          <p className="text-sm">{instanceInfo.region}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Database Version</p>
          <p className="text-sm">{instanceInfo.databaseVersion}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">State</p>
          <p className="text-sm">{instanceInfo.state}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Machine Type</p>
          <p className="text-sm">{instanceInfo.settings.tier}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Storage</p>
          <p className="text-sm">{instanceInfo.settings.dataDiskSizeGb} GB</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">High Availability</p>
          <p className="text-sm">{instanceInfo.settings.availabilityType}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Connection Name</p>
          <p className="font-mono text-sm">{instanceInfo.connectionName}</p>
        </div>
      </div>

      {instanceInfo.ipAddresses && instanceInfo.ipAddresses.length > 0 && (
        <div className="mt-4">
          <p className="text-muted-foreground mb-1 text-sm">IP Addresses</p>
          <div className="space-y-1">
            {instanceInfo.ipAddresses.map((ip, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs font-medium">{ip.type}:</span>
                <code className="bg-muted rounded px-1 py-0.5 text-xs">{ip.ipAddress}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder component for database connection selector
function DatabaseConnectionSelector({
  _instanceId,
  _region,
  _connections
}: {
  _instanceId: string;
  _region: string;
  _connections: Connection[];
}) {
  return (
    <div className="mt-4">
      <h3 className="text-md mb-2 font-semibold">Connect to this instance</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Choose an existing database connection or create a new one to connect to this Cloud SQL instance.
      </p>

      {/* Implement the connection selector here */}
      <Button variant="outline">Configure Connection</Button>
    </div>
  );
}
