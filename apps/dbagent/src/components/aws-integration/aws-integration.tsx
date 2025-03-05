'use client';

import {
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
  toast
} from '@internal/components';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RDSClusterDetailedInfo, RDSClusterInfo } from '~/lib/aws/rds';
import { Connection } from '~/lib/db/connections';
import { fetchRDSClusterDetails, fetchRDSClusters, getAWSIntegration } from './actions';
import { DatabaseConnectionSelector } from './db-instance-connector';
import { RDSClusterCard } from './rds-instance-card';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1'
];

export function AWSIntegration({ projectId, connections }: { projectId: string; connections: Connection[] }) {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [rdsClusters, setRdsClusters] = useState<RDSClusterInfo[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [clusterDetails, setClusterDetails] = useState<RDSClusterDetailedInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAWSIntegration = async () => {
      const response = await getAWSIntegration();
      if (response.success && response.data) {
        setAccessKeyId(response.data.accessKeyId);
        setSecretAccessKey(response.data.secretAccessKey);
        setRegion(response.data.region);
      }
    };
    void loadAWSIntegration();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetchRDSClusters(projectId, accessKeyId, secretAccessKey, region);
      if (response.success) {
        if (response.data.length === 0) {
          toast('No RDS clusters found in the selected region');
        } else {
          setRdsClusters(response.data);
          toast('RDS clusters fetched successfully');
        }
      } else {
        toast(`Error: Failed to fetch RDS clusters. ${response.message}`);
      }
    } catch (error) {
      toast('Error: Failed to fetch RDS clusters. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClusterSelect = async (identifier: string) => {
    const cluster = rdsClusters.find((cluster) => cluster.identifier === identifier);
    if (!cluster) {
      toast('Error: Selected cluster not found');
      return;
    }
    setSelectedCluster(cluster.identifier);
    try {
      const details = await fetchRDSClusterDetails(cluster);
      setClusterDetails(details.data);
    } catch (error) {
      toast('Error: Failed to fetch RDS instance details.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>AWS Integration</CardTitle>
          <CardDescription>Configure your AWS integration and select an RDS cluster</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input id="accessKeyId" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <Input
                id="secretAccessKey"
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Clusters
                </>
              ) : (
                'Fetch RDS Clusters/Instances'
              )}
            </Button>
          </form>

          {rdsClusters.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-lg font-semibold">Select an RDS Cluster/Instance</h3>
              <Select value={selectedCluster} onValueChange={handleClusterSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an RDS cluster/instance" />
                </SelectTrigger>
                <SelectContent>
                  {rdsClusters.map((cluster) => (
                    <SelectItem key={cluster.identifier} value={cluster.identifier}>
                      {cluster.identifier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {clusterDetails && (
            <div className="mt-8">
              <RDSClusterCard clusterInfo={clusterDetails} />
              <DatabaseConnectionSelector
                clusterIdentifier={clusterDetails.identifier}
                region={region}
                connections={connections}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
