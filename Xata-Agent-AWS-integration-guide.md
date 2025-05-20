# Xata Agent - AWS Integration Guide

Connecting your Xata Agent to AWS allows it to discover and interact with your RDS instances. This guide outlines the different methods available for configuring AWS authentication.

## Authentication Methods

You can configure AWS authentication using one of three methods:

1.  **IAM User Credentials:** Provide an Access Key ID and Secret Access Key for an IAM user.
2.  **CloudFormation IAM Role (Recommended):** Use our provided CloudFormation template to create a dedicated IAM role with the necessary permissions. This is a secure and convenient "one-click" setup.
3.  **EC2 Instance IAM Role:** If your Xata Agent is running on an EC2 instance, it can automatically use an IAM role associated with that instance.

---

### 1. IAM User Credentials Method

This method involves creating an IAM user with specific permissions and then providing its Access Key ID and Secret Access Key to the Xata Agent.

*   **Permissions Required:**
    *   `rds:DescribeDBClusters`
    *   `rds:DescribeDBInstances`
    *   `rds:DescribeDBLogFiles`
    *   `rds:DownloadDBLogFilePortion`
    *   `cloudwatch:GetMetricStatistics`
    *   Optionally, `ec2:DescribeInstances` (if you want the agent to be able to detect if it's running on an EC2 instance for the EC2 Instance IAM Role method).

*   **Steps:**
    1.  Create an IAM policy with the permissions listed above.
    2.  Create an IAM user and attach this policy to it.
    3.  Generate an Access Key ID and Secret Access Key for this user.
    4.  In the Xata Agent UI, select "Access Key Credentials" as the authentication method.
    5.  Enter the Access Key ID, Secret Access Key, and select your AWS Region.
    6.  Click "Test Connection & Fetch RDS Clusters/Instances".

---

### 2. CloudFormation IAM Role Method (Recommended)

This method uses an AWS CloudFormation template to automatically create an IAM role with the exact permissions required by the Xata Agent. You then provide the ARN (Amazon Resource Name) of this role to the agent.

*   **Steps:**
    1.  In the Xata Agent UI, select "CloudFormation Role" as the authentication method.
    2.  Click the **"Launch Stack"** button. This will take you to the AWS CloudFormation console, pre-filled with our template.
        *   The template URL is: `https://raw.githubusercontent.com/xataio/agent/main/apps/dbagent/public/xata-agent-iam-role.yaml`
        *   (If you prefer, you can download the template from [this path in our repository](/public/xata-agent-iam-role.yaml) and upload it to your own S3 bucket to use as the template source in CloudFormation.)
    3.  **In the AWS CloudFormation "Create stack" page:**
        *   Verify the template URL. Click "Next".
        *   **Specify stack details:**
            *   **Stack name:** Keep the default (`XataAgentRDSAccessRoleStack`) or change it if needed.
            *   **Parameters:**
                *   `TrustedAwsAccountId`: **Crucially, enter the AWS Account ID where your Xata Agent is running or the AWS Account ID whose users/roles will need to assume this role.** This allows the Xata Agent (or entities in that account) to assume the role being created in the target account (where your RDS instances are).
                *   `RoleName`: Keep the default (`XataAgentRDSAccessRole`) unless you have specific naming conventions.
            *   Click "Next".
        *   **Configure stack options:** You can usually leave these as default. Click "Next".
        *   **Review:** Scroll to the bottom and check the box "I acknowledge that AWS CloudFormation might create IAM resources." This is required because the template creates an IAM role and policy.
        *   Click **"Create stack"**.
    4.  Wait for the CloudFormation stack status to become `CREATE_COMPLETE`. This might take a minute or two.
    5.  Once the stack is created, go to the **"Outputs"** tab for the stack in the AWS CloudFormation console.
    6.  Copy the value of the `XataAgentRoleArn` output. It will look like `arn:aws:iam::YOUR_ACCOUNT_ID:role/XataAgentRDSAccessRole`.
    7.  Back in the Xata Agent UI:
        *   Paste the copied ARN into the "IAM Role ARN (from CloudFormation Output)" field.
        *   Select the AWS Region where your RDS instances are located.
    8.  Click "Test Connection & Fetch RDS Clusters/Instances".

---

### 3. EC2 Instance IAM Role Method

If your Xata Agent is deployed on an AWS EC2 instance, you can assign an IAM role to the instance itself. The agent can then automatically use these credentials.

*   **How it works:**
    *   The Xata Agent UI will attempt to detect if it's running on an EC2 instance that has an IAM role with sufficient permissions.
    *   If detected, the "EC2 Instance IAM Role" option will become available for selection.

*   **Required Permissions for the EC2 Instance's IAM Role:**
    The IAM role attached to your EC2 instance must have a policy granting the following permissions:
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "rds:DescribeDBClusters",
                    "rds:DescribeDBInstances",
                    "rds:DescribeDBLogFiles",
                    "rds:DownloadDBLogFilePortion",
                    "cloudwatch:GetMetricStatistics"
                ],
                "Resource": "*"
            }
        ]
    }
    ```
    *Note: `Resource: "*"` allows access to all resources for these actions. For a more secure setup, you can restrict this to specific RDS instances/clusters or CloudWatch resources if known.*

*   **Steps:**
    1.  Ensure your EC2 instance has an IAM role attached with the permissions listed above.
    2.  In the Xata Agent UI, if the "EC2 Instance IAM Role" option appears and is selectable:
        *   Select "EC2 Instance IAM Role".
        *   Select the AWS Region where your RDS instances are located.
    3.  Click "Test Connection & Fetch RDS Clusters/Instances".

If you have any issues or questions, please refer to our support channels.
```
