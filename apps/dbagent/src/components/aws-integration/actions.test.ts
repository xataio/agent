import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRDSClusters,
  fetchRDSClusterDetails,
  getAWSIntegration,
  checkEc2InstanceRoleStatus,
  saveClusterDetails,
} from './actions';
import {
  isEc2InstanceWithRole,
  initializeRDSClient,
  listRDSClusters,
  listRDSInstances,
  getRDSClusterInfo,
  getRDSInstanceInfo,
  RDSClient, // Type for mock
  CloudWatchClient, // Type for mock
} from '~/lib/aws/rds';
import { getIntegration, saveIntegration, AwsIntegration } from '~/lib/db/integrations';
import { getUserSessionDBAccess, DBAccess } from '~/lib/db/db';
import { saveCluster, associateClusterConnection } from '~/lib/db/aws-clusters';
import { Connection } from '~/lib/db/schema';

// Mock modules
vi.mock('~/lib/aws/rds.ts');
vi.mock('~/lib/db/integrations.ts');
vi.mock('~/lib/db/db.ts');
vi.mock('~/lib/db/aws-clusters.ts');

const mockDbAccess = {} as DBAccess; // Dummy DBAccess object

describe('components/aws-integration/actions.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock implementations
    vi.mocked(getUserSessionDBAccess).mockResolvedValue(mockDbAccess);
    vi.mocked(isEc2InstanceWithRole).mockResolvedValue(false); // Default to not EC2
    vi.mocked(initializeRDSClient).mockResolvedValue({} as RDSClient); // Mock RDSClient instance
    vi.mocked(listRDSClusters).mockResolvedValue([]);
    vi.mocked(listRDSInstances).mockResolvedValue([]);
    vi.mocked(getIntegration).mockResolvedValue(null);
    vi.mocked(saveIntegration).mockResolvedValue(undefined);
    vi.mocked(getRDSClusterInfo).mockResolvedValue(null);
    vi.mocked(getRDSInstanceInfo).mockResolvedValue(null);
    vi.mocked(saveCluster).mockResolvedValue(1); // Mocked cluster ID
    vi.mocked(associateClusterConnection).mockResolvedValue(undefined);

  });

  describe('checkEc2InstanceRoleStatus', () => {
    it('should return true if isEc2InstanceWithRole returns true', async () => {
      vi.mocked(isEc2InstanceWithRole).mockResolvedValue(true);
      const result = await checkEc2InstanceRoleStatus('test-project-id');
      expect(result.isRunningOnEc2WithRole).toBe(true);
    });

    it('should return false if isEc2InstanceWithRole returns false', async () => {
      vi.mocked(isEc2InstanceWithRole).mockResolvedValue(false);
      const result = await checkEc2InstanceRoleStatus('test-project-id');
      expect(result.isRunningOnEc2WithRole).toBe(false);
    });

    it('should return false if isEc2InstanceWithRole throws an error', async () => {
      vi.mocked(isEc2InstanceWithRole).mockRejectedValue(new Error('Test error'));
      const result = await checkEc2InstanceRoleStatus('test-project-id');
      expect(result.isRunningOnEc2WithRole).toBe(false);
    });
  });

  describe('fetchRDSClusters', () => {
    const projectId = 'project1';
    const mockRdsClient = {} as RDSClient;

    beforeEach(() => {
        vi.mocked(initializeRDSClient).mockResolvedValue(mockRdsClient);
    });
    
    it('should use "credentials" auth, call dependencies, and save integration', async () => {
      const integration: AwsIntegration = {
        authMethod: 'credentials',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        region: 'us-east-1',
      };
      vi.mocked(listRDSClusters).mockResolvedValueOnce([{ identifier: 'cluster1' } as any]);
      vi.mocked(listRDSInstances).mockResolvedValueOnce([{ identifier: 'instance1', dbClusterIdentifier: null } as any]);


      const result = await fetchRDSClusters(projectId, integration);

      expect(initializeRDSClient).toHaveBeenCalledWith(integration);
      expect(listRDSClusters).toHaveBeenCalledWith(mockRdsClient);
      expect(listRDSInstances).toHaveBeenCalledWith(mockRdsClient);
      expect(saveIntegration).toHaveBeenCalledWith(mockDbAccess, projectId, 'aws', integration);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // cluster1 + instance1 (as standalone)
      expect(result.data.find(c => c.identifier === 'cluster1')).toBeDefined();
      expect(result.data.find(c => c.identifier === 'instance1' && c.isStandaloneInstance)).toBeDefined();
    });

    it('should use "cloudformation" auth and call dependencies', async () => {
      const integration: AwsIntegration = {
        authMethod: 'cloudformation',
        cloudformationStackArn: 'arn:test',
        region: 'eu-west-1',
      };
      await fetchRDSClusters(projectId, integration);
      expect(initializeRDSClient).toHaveBeenCalledWith(integration);
      expect(saveIntegration).toHaveBeenCalledWith(mockDbAccess, projectId, 'aws', integration);
    });

    it('should use "ec2instance" auth and call dependencies', async () => {
      const integration: AwsIntegration = {
        authMethod: 'ec2instance',
        region: 'ap-southeast-2',
      };
      await fetchRDSClusters(projectId, integration);
      expect(initializeRDSClient).toHaveBeenCalledWith(integration);
      expect(saveIntegration).toHaveBeenCalledWith(mockDbAccess, projectId, 'aws', integration);
    });
    
    it('should handle errors during RDS operations', async () => {
        const integration: AwsIntegration = { authMethod: 'credentials', accessKeyId: 'k', secretAccessKey: 's', region: 'r' };
        vi.mocked(initializeRDSClient).mockRejectedValue(new Error('Client init failed'));
        
        const result = await fetchRDSClusters(projectId, integration);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Client init failed');
        expect(saveIntegration).not.toHaveBeenCalled(); // Should not save if client init fails
    });
  });

  describe('getAWSIntegration', () => {
    const projectId = 'project-get';

    it('should return integration data if found', async () => {
      const mockAwsData: AwsIntegration = {
        authMethod: 'credentials',
        accessKeyId: 'foundKey',
        secretAccessKey: 'foundSecret',
        region: 'us-west-1',
      };
      vi.mocked(getIntegration).mockResolvedValue(mockAwsData);
      const result = await getAWSIntegration(projectId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAwsData);
    });

    it('should default authMethod to "credentials" if missing', async () => {
      const mockAwsDataOld = {
        // authMethod is missing
        accessKeyId: 'oldKey',
        secretAccessKey: 'oldSecret',
        region: 'eu-central-1',
      };
      // Need to cast to any for mock, then AwsIntegration for validatedAws
      vi.mocked(getIntegration).mockResolvedValue(mockAwsDataOld as any); 
      
      const result = await getAWSIntegration(projectId);
      expect(result.success).toBe(true);
      expect(result.data?.authMethod).toBe('credentials');
      expect(result.data?.accessKeyId).toBe('oldKey');
      expect(result.data?.region).toBe('eu-central-1');
    });
    
    it('should correctly structure for cloudformation if authMethod is cloudformation but other fields are present', async () => {
        const mockAwsDataMixed: any = {
          authMethod: 'cloudformation',
          cloudformationStackArn: 'arn:cfn',
          accessKeyId: 'shouldBeIgnored', // This should be ignored
          region: 'eu-central-1',
        };
        vi.mocked(getIntegration).mockResolvedValue(mockAwsDataMixed);
        
        const result = await getAWSIntegration(projectId);
        expect(result.success).toBe(true);
        expect(result.data?.authMethod).toBe('cloudformation');
        expect(result.data?.cloudformationStackArn).toBe('arn:cfn');
        expect((result.data as any).accessKeyId).toBeUndefined(); // Ensure credential-specific fields are not there
        expect(result.data?.region).toBe('eu-central-1');
      });


    it('should return null if integration not found', async () => {
      vi.mocked(getIntegration).mockResolvedValue(null);
      const result = await getAWSIntegration(projectId);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
    
    it('should handle errors from getIntegration', async () => {
        vi.mocked(getIntegration).mockRejectedValue(new Error('DB error'));
        const result = await getAWSIntegration(projectId);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Error fetching AWS integration');
    });
  });
  
  describe('fetchRDSClusterDetails', () => {
    const projectId = 'project-details';
    const mockRdsClient = {} as RDSClient;
    const mockIntegration: AwsIntegration = { authMethod: 'credentials', accessKeyId: 'k', secretAccessKey: 's', region: 'r' };
    const mockClusterInfo = { identifier: 'cluster-1', isStandaloneInstance: false } as any;
    const mockInstanceInfo = { identifier: 'instance-1', isStandaloneInstance: true } as any;

    beforeEach(() => {
        vi.mocked(initializeRDSClient).mockResolvedValue(mockRdsClient);
    });

    it('should fetch cluster details for a cluster', async () => {
        const detailedClusterData = { ...mockClusterInfo, instances: [] };
        vi.mocked(getRDSClusterInfo).mockResolvedValue(detailedClusterData);
        
        const result = await fetchRDSClusterDetails(projectId, mockClusterInfo, mockIntegration);
        
        expect(initializeRDSClient).toHaveBeenCalledWith(mockIntegration);
        expect(getRDSClusterInfo).toHaveBeenCalledWith(mockClusterInfo.identifier, mockRdsClient);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(detailedClusterData);
    });

    it('should fetch instance details for a standalone instance', async () => {
        const detailedInstanceData = { ...mockInstanceInfo, someDetail: 'detail' };
        vi.mocked(getRDSInstanceInfo).mockResolvedValue(detailedInstanceData);

        const result = await fetchRDSClusterDetails(projectId, mockInstanceInfo, mockIntegration);

        expect(initializeRDSClient).toHaveBeenCalledWith(mockIntegration);
        expect(getRDSInstanceInfo).toHaveBeenCalledWith(mockInstanceInfo.identifier, mockRdsClient);
        expect(result.success).toBe(true);
        expect(result.data?.identifier).toBe(mockInstanceInfo.identifier);
        expect(result.data?.instances[0]).toEqual(detailedInstanceData);
    });
    
    it('should return error if client initialization fails', async () => {
        vi.mocked(initializeRDSClient).mockRejectedValue(new Error("Client init failed"));
        const result = await fetchRDSClusterDetails(projectId, mockClusterInfo, mockIntegration);
        expect(result.success).toBe(false);
        expect(result.message).toContain("Client init failed");
    });
  });

  describe('saveClusterDetails', () => {
    const projectId = 'project-save-details';
    const region = 'us-east-1';
    const clusterIdentifier = 'my-cluster';
    const connection = { projectId, id: 'conn-1' } as Connection;
    const mockIntegration: AwsIntegration = { authMethod: 'credentials', accessKeyId: 'k', secretAccessKey: 's', region };
    const mockRdsClient = {} as RDSClient;

    beforeEach(() => {
        vi.mocked(initializeRDSClient).mockResolvedValue(mockRdsClient);
    });

    it('should save details for a cluster', async () => {
        const clusterData = { identifier: clusterIdentifier, instances: [] } as any;
        vi.mocked(getRDSClusterInfo).mockResolvedValue(clusterData);
        vi.mocked(getRDSInstanceInfo).mockResolvedValue(null); // Ensure it doesn't think it's an instance

        const result = await saveClusterDetails(clusterIdentifier, region, connection, mockIntegration);

        expect(initializeRDSClient).toHaveBeenCalledWith(mockIntegration);
        expect(getRDSClusterInfo).toHaveBeenCalledWith(clusterIdentifier, mockRdsClient);
        expect(saveCluster).toHaveBeenCalledWith(mockDbAccess, {
            projectId,
            clusterIdentifier,
            region: mockIntegration.region,
            data: clusterData
        });
        expect(associateClusterConnection).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should save details for a standalone instance', async () => {
        const instanceData = { identifier: clusterIdentifier } as any;
        vi.mocked(getRDSClusterInfo).mockResolvedValue(null); // Not a cluster
        vi.mocked(getRDSInstanceInfo).mockResolvedValue(instanceData);

        const result = await saveClusterDetails(clusterIdentifier, region, connection, mockIntegration);

        expect(initializeRDSClient).toHaveBeenCalledWith(mockIntegration);
        expect(getRDSInstanceInfo).toHaveBeenCalledWith(clusterIdentifier, mockRdsClient);
        expect(saveCluster).toHaveBeenCalledWith(mockDbAccess, expect.objectContaining({
            projectId,
            clusterIdentifier,
            region: mockIntegration.region,
            data: expect.objectContaining({ isStandaloneInstance: true, instances: [instanceData] })
        }));
        expect(associateClusterConnection).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });
    
    it('should return error if neither cluster nor instance found', async () => {
        vi.mocked(getRDSClusterInfo).mockResolvedValue(null);
        vi.mocked(getRDSInstanceInfo).mockResolvedValue(null);

        const result = await saveClusterDetails(clusterIdentifier, region, connection, mockIntegration);
        expect(result.success).toBe(false);
        expect(result.message).toContain('RDS instance not found'); // This is the message for the instance check, which comes after cluster
    });
  });

});
```
