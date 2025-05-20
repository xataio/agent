import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isEc2InstanceWithRole, initializeRDSClient, initializeCloudWatchClient } from './rds';
import { RDSClient } from '@aws-sdk/client-rds';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { AwsIntegration } from '../db/integrations';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-rds');
vi.mock('@aws-sdk/client-cloudwatch');
vi.mock('@aws-sdk/client-sts');

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('lib/aws/rds.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks for each test
    mockFetch.mockReset(); // Reset fetch mock specifically
  });

  describe('isEc2InstanceWithRole', () => {
    it('should return true if on EC2 with an IAM role', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('test-instance-id', { status: 200 })) // instance-id
        .mockResolvedValueOnce(new Response('test-role-name', { status: 200 })); // iam/security-credentials/
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://169.254.169.254/latest/meta-data/instance-id', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', expect.any(Object));
    });

    it('should return false if on EC2 without an IAM role (empty role name)', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('test-instance-id', { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 200 })); // Empty role name
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
    });

    it('should return false if on EC2 without an IAM role (404 for role)', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('test-instance-id', { status: 200 }))
        .mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
    });

    it('should return false if not on EC2 (instance-id fetch fails)', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    it('should return false if not on EC2 (instance-id fetch throws error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
    });

    it('should return false if IAM role fetch times out (AbortError)', async () => {
      const abortError = new Error('Timeout');
      abortError.name = 'AbortError';
      mockFetch
        .mockResolvedValueOnce(new Response('test-instance-id', { status: 200 }))
        .mockRejectedValueOnce(abortError);
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
    });

     it('should return false if IAM role fetch fails for other reasons', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('test-instance-id', { status: 200 }))
        .mockRejectedValueOnce(new Error('Some other network error'));
      
      const result = await isEc2InstanceWithRole();
      expect(result).toBe(false);
    });
  });

  describe('initializeRDSClient', () => {
    const mockRegion = 'us-east-1';

    it('should initialize with credentials for "credentials" authMethod', async () => {
      const integration: AwsIntegration = {
        authMethod: 'credentials',
        accessKeyId: 'testAccessKey',
        secretAccessKey: 'testSecretKey',
        region: mockRegion,
      };
      await initializeRDSClient(integration);
      expect(RDSClient).toHaveBeenCalledWith({
        region: mockRegion,
        credentials: {
          accessKeyId: 'testAccessKey',
          secretAccessKey: 'testSecretKey',
        },
      });
    });

    it('should initialize with assumed role credentials for "cloudformation" authMethod', async () => {
      const mockStsSend = vi.fn().mockResolvedValue({
        Credentials: {
          AccessKeyId: 'tempAccessKey',
          SecretAccessKey: 'tempSecretKey',
          SessionToken: 'tempSessionToken',
        },
      });
      STSClient.prototype.send = mockStsSend;
      // (STSClient as any).mockImplementation(() => ({ send: mockStsSend }));


      const integration: AwsIntegration = {
        authMethod: 'cloudformation',
        cloudformationStackArn: 'arn:aws:iam::123456789012:role/TestRole',
        region: mockRegion,
      };
      await initializeRDSClient(integration);
      
      expect(STSClient).toHaveBeenCalledWith({ region: mockRegion });
      expect(mockStsSend).toHaveBeenCalledWith(expect.any(AssumeRoleCommand));
      // A more specific check for AssumeRoleCommand input if needed:
      const assumeRoleCommandInstance = mockStsSend.mock.calls[0][0];
      expect(assumeRoleCommandInstance.input).toEqual({
        RoleArn: 'arn:aws:iam::123456789012:role/TestRole',
        RoleSessionName: 'DBAgentRDSSession',
      });

      expect(RDSClient).toHaveBeenCalledWith({
        region: mockRegion,
        credentials: {
          accessKeyId: 'tempAccessKey',
          secretAccessKey: 'tempSecretKey',
          sessionToken: 'tempSessionToken',
        },
      });
    });
    
    it('should throw error if assuming role fails for "cloudformation" authMethod', async () => {
      const mockStsSend = vi.fn().mockResolvedValue({}); // No Credentials
      STSClient.prototype.send = mockStsSend;

      const integration: AwsIntegration = {
        authMethod: 'cloudformation',
        cloudformationStackArn: 'arn:aws:iam::123456789012:role/TestRole',
        region: mockRegion,
      };
      
      await expect(initializeRDSClient(integration)).rejects.toThrow('Failed to assume role, credentials not received.');
    });

    it('should initialize with region for "ec2instance" authMethod', async () => {
      const integration: AwsIntegration = {
        authMethod: 'ec2instance',
        region: mockRegion,
      };
      await initializeRDSClient(integration);
      expect(RDSClient).toHaveBeenCalledWith({ region: mockRegion });
    });
  });

  describe('initializeCloudWatchClient', () => {
    const mockRegion = 'us-west-2';

    it('should initialize with credentials for "credentials" authMethod', async () => {
      const integration: AwsIntegration = {
        authMethod: 'credentials',
        accessKeyId: 'cwAccessKey',
        secretAccessKey: 'cwSecretKey',
        region: mockRegion,
      };
      await initializeCloudWatchClient(integration);
      expect(CloudWatchClient).toHaveBeenCalledWith({
        region: mockRegion,
        credentials: {
          accessKeyId: 'cwAccessKey',
          secretAccessKey: 'cwSecretKey',
        },
      });
    });

    it('should initialize with assumed role credentials for "cloudformation" authMethod', async () => {
      const mockStsSend = vi.fn().mockResolvedValue({
        Credentials: {
          AccessKeyId: 'tempCwAccessKey',
          SecretAccessKey: 'tempCwSecretKey',
          SessionToken: 'tempCwSessionToken',
        },
      });
      STSClient.prototype.send = mockStsSend;

      const integration: AwsIntegration = {
        authMethod: 'cloudformation',
        cloudformationStackArn: 'arn:aws:iam::123456789012:role/CwTestRole',
        region: mockRegion,
      };
      await initializeCloudWatchClient(integration);
      
      expect(STSClient).toHaveBeenCalledWith({ region: mockRegion });
      expect(mockStsSend).toHaveBeenCalledWith(expect.any(AssumeRoleCommand));
      const assumeRoleCommandInstance = mockStsSend.mock.calls[0][0];
      expect(assumeRoleCommandInstance.input).toEqual({
        RoleArn: 'arn:aws:iam::123456789012:role/CwTestRole',
        RoleSessionName: 'DBAgentCloudWatchSession',
      });

      expect(CloudWatchClient).toHaveBeenCalledWith({
        region: mockRegion,
        credentials: {
          accessKeyId: 'tempCwAccessKey',
          secretAccessKey: 'tempCwSecretKey',
          sessionToken: 'tempCwSessionToken',
        },
      });
    });
    
    it('should throw error if assuming role fails for "cloudformation" authMethod', async () => {
        const mockStsSend = vi.fn().mockRejectedValue(new Error("STS error"));
        STSClient.prototype.send = mockStsSend;
  
        const integration: AwsIntegration = {
          authMethod: 'cloudformation',
          cloudformationStackArn: 'arn:aws:iam::123456789012:role/TestRole',
          region: mockRegion,
        };
        
        await expect(initializeCloudWatchClient(integration)).rejects.toThrow(/Failed to assume role with ARN/);
      });

    it('should initialize with region for "ec2instance" authMethod', async () => {
      const integration: AwsIntegration = {
        authMethod: 'ec2instance',
        region: mockRegion,
      };
      await initializeCloudWatchClient(integration);
      expect(CloudWatchClient).toHaveBeenCalledWith({ region: mockRegion });
    });
  });
});
```
