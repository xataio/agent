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
  toast
} from '@xata.io/components';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RDSClusterDetailedInfo, RDSClusterInfo } from '~/lib/aws/rds';
import { Connection } from '~/lib/db/schema';
import { checkEc2InstanceRoleStatus, fetchRDSClusterDetails, fetchRDSClusters, getAWSIntegration } from './actions';
import { DatabaseConnectionSelector } from './db-instance-connector';
import { RDSClusterCard } from './rds-instance-card';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'af-south-1',
  'ap-east-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-southeast-5',
  'ap-southeast-6',
  'ca-central-1',
  'ca-west-1',
  'il-central-1',
  'me-central-1',
  'me-south-1',
  'sa-east-1'
];

type AuthMethod = 'credentials' | 'cloudformation' | 'ec2';

export function AWSIntegration({ projectId, connections }: { projectId: string; connections: Connection[] }) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [region, setRegion] = useState('');
  const [rdsClusters, setRdsClusters] = useState<RDSClusterInfo[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [clusterDetails, setClusterDetails] = useState<RDSClusterDetailedInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEc2RoleActive, setIsEc2RoleActive] = useState<boolean | null>(null);
  const [isLoadingEc2Status, setIsLoadingEc2Status] = useState(false);

  useEffect(() => {
    const loadAWSIntegration = async () => {
      setIsLoading(true);
      const response = await getAWSIntegration(projectId);
      if (response.success && response.data) {
        const {
          authMethod: storedAuthMethod,
          accessKeyId: storedAccessKeyId,
          secretAccessKey: storedSecretAccessKey,
          region: storedRegion,
          roleArn: storedRoleArn
        } = response.data as any;
        if (storedAuthMethod) setAuthMethod(storedAuthMethod);
        if (storedAccessKeyId) setAccessKeyId(storedAccessKeyId);
        if (storedSecretAccessKey) setSecretAccessKey(storedSecretAccessKey);
        if (storedRegion) setRegion(storedRegion);
        if (storedRoleArn) setRoleArn(storedRoleArn);
      }
      setIsLoading(false);
    };
    void loadAWSIntegration();

    const checkEc2Status = async () => {
      setIsLoadingEc2Status(true);
      try {
        const ec2Status = await checkEc2InstanceRoleStatus();
        setIsEc2RoleActive(ec2Status.data?.hasIAMRole ?? false);
      } catch (error) {
        console.error('Failed to check EC2 instance status', error);
        setIsEc2RoleActive(false);
      } finally {
        setIsLoadingEc2Status(false);
      }
    };
    void checkEc2Status();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRdsClusters([]);
    setSelectedCluster('');
    setClusterDetails(null);

    let authPayload: any;
    switch (authMethod) {
      case 'credentials':
        if (!accessKeyId || !secretAccessKey) {
          toast('Error: Access Key ID and Secret Access Key are required for credentials authentication.');
          setIsLoading(false);
          return;
        }
        authPayload = { type: 'credentials', accessKeyId, secretAccessKey, region };
        break;
      case 'cloudformation':
        if (!roleArn) {
          toast('Error: Role ARN is required for CloudFormation authentication.');
          setIsLoading(false);
          return;
        }
        authPayload = { type: 'cloudformation', roleArn, region };
        break;
      case 'ec2':
        authPayload = { type: 'ec2', region };
        break;
      default:
        toast('Error: Invalid authentication method selected.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetchRDSClusters(projectId, authPayload);
      if (response.success) {
        if (response.data.length === 0) {
          toast('No RDS clusters/instances found in the selected region with the provided authentication.');
        } else {
          setRdsClusters(response.data);
          toast('RDS clusters/instances fetched successfully');
        }
      } else {
        toast(`Error: Failed to fetch RDS clusters/instances. ${response.message}`);
      }
    } catch (error) {
      toast('Error: Failed to fetch RDS clusters/instances. Please check your configuration and try again.');
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
    setIsLoading(true);
    try {
      let authPayload: any;
      switch (authMethod) {
        case 'credentials':
          authPayload = { type: 'credentials', accessKeyId, secretAccessKey, region };
          break;
        case 'cloudformation':
          authPayload = { type: 'cloudformation', roleArn, region };
          break;
        case 'ec2':
          authPayload = { type: 'ec2', region };
          break;
        default:
          throw new Error('Invalid auth method');
      }
      const details = await fetchRDSClusterDetails(projectId, cluster, authPayload);
      setClusterDetails(details.data);
    } catch (error) {
      toast('Error: Failed to fetch RDS instance details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AWS Integration</CardTitle>
        <CardDescription>Configure your AWS integration and select an RDS cluster/instance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>AWS Authentication Guide</AlertTitle>
            <AlertDescription>
              For detailed instructions on all authentication methods, including setting up IAM roles,{' '}
              <Link
                href="https://github.com/xataio/agent/wiki/Xata-Agent-%E2%80%90-AWS-integration-guide"
                target="_blank"
                className="font-medium underline"
              >
                follow this guide <ExternalLink className="inline-block h-3 w-3" />
              </Link>
              .
            </AlertDescription>
          </Alert>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="authMethod">Authentication Method</Label>
            <Select value={authMethod} onValueChange={(value) => setAuthMethod(value as AuthMethod)} required>
              <SelectTrigger id="authMethod">
                <SelectValue placeholder="Select authentication method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credentials">Credentials (Access Key)</SelectItem>
                <SelectItem value="cloudformation">CloudFormation (IAM Role ARN)</SelectItem>
                <SelectItem value="ec2">EC2 Instance IAM Role (Automatic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authMethod === 'credentials' && (
            <>
              <div>
                <Label htmlFor="accessKeyId">Access Key ID</Label>
                <Input
                  id="accessKeyId"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  required={authMethod === 'credentials'}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>
              <div>
                <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                <Input
                  id="secretAccessKey"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  required={authMethod === 'credentials'}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>
            </>
          )}

          {authMethod === 'cloudformation' && (
            <div>
              <Label htmlFor="roleArn">IAM Role ARN</Label>
              <Input
                id="roleArn"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                required={authMethod === 'cloudformation'}
                placeholder="arn:aws:iam::123456789012:role/XataAgentRole"
              />
              <p className="text-muted-foreground mt-2 text-sm">
                Create an IAM role using our{' '}
                <Link
                  href="/xata-agent-iam-role.yaml"
                  target="_blank"
                  className="font-medium underline"
                  download="xata-agent-iam-role.yaml"
                >
                  CloudFormation template <ExternalLink className="inline-block h-3 w-3" />
                </Link>{' '}
                and paste the Role ARN here.
              </p>
            </div>
          )}

          {authMethod === 'ec2' && (
            <Alert variant={isEc2RoleActive === null ? 'default' : isEc2RoleActive ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>EC2 Instance IAM Role</AlertTitle>
              <AlertDescription>
                {isLoadingEc2Status
                  ? 'Checking EC2 IAM role status...'
                  : isEc2RoleActive === true
                    ? 'An IAM role is detected on this EC2 instance. It will be used for authentication if it has the required permissions.'
                    : isEc2RoleActive === false
                      ? 'No suitable IAM role detected or not running on an EC2 instance. Ensure an IAM role with necessary permissions is attached to the EC2 instance.'
                      : 'Unable to determine EC2 IAM role status. Ensure this application is running on an EC2 instance with an appropriate IAM role.'}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="region">AWS Region</Label>
            <Select value={region} onValueChange={setRegion} required>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select AWS region" />
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

          <Button type="submit" disabled={isLoading || isLoadingEc2Status}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              'Fetch RDS Clusters/Instances'
            )}
          </Button>
        </form>

        {rdsClusters.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold">Select an RDS Cluster/Instance</h3>
            <Select value={selectedCluster} onValueChange={handleClusterSelect} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select an RDS cluster/instance" />
              </SelectTrigger>
              <SelectContent>
                {rdsClusters.map((cluster) => (
                  <SelectItem key={cluster.identifier} value={cluster.identifier}>
                    {cluster.identifier} ({cluster.engine})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {clusterDetails && !isLoading && (
          <div className="mt-8">
            <RDSClusterCard clusterInfo={clusterDetails} />
            <DatabaseConnectionSelector clusterIdentifier={clusterDetails.identifier} connections={connections} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
