import { Card, CardContent, CardHeader, CardTitle } from '@xata.io/components';
import { RDSClusterDetailedInfo, RDSInstanceInfo } from '~/lib/aws/rds';

interface RDSInstanceCardProps {
  instanceInfo: RDSInstanceInfo;
}

interface RDSClusterCardProps {
  clusterInfo: RDSClusterDetailedInfo;
}

export function RDSClusterCard({ clusterInfo }: RDSClusterCardProps) {
  return (
    <div className="space-y-4">
      {!clusterInfo.isStandaloneInstance && (
        <Card>
          <CardHeader>
            <CardTitle>RDS Cluster Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="font-semibold">Cluster Identifier</dt>
                <dd>{clusterInfo.identifier}</dd>
              </div>
              <div>
                <dt className="font-semibold">Engine</dt>
                <dd>{clusterInfo.engine}</dd>
              </div>
              <div>
                <dt className="font-semibold">Engine Version</dt>
                <dd>{clusterInfo.engineVersion}</dd>
              </div>
              <div>
                <dt className="font-semibold">Status</dt>
                <dd>{clusterInfo.status}</dd>
              </div>
              <div>
                <dt className="font-semibold">Endpoint</dt>
                <dd>{clusterInfo.endpoint || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Reader Endpoint</dt>
                <dd>{clusterInfo.readerEndpoint || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Port</dt>
                <dd>{clusterInfo.port || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Multi-AZ</dt>
                <dd>{clusterInfo.multiAZ ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Instance Count</dt>
                <dd>{clusterInfo.instanceCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {clusterInfo.instances.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Cluster Instances</h3>
          {clusterInfo.instances.map((instance: RDSInstanceInfo) => (
            <RDSInstanceCard key={instance.identifier} instanceInfo={instance} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RDSInstanceCard({ instanceInfo }: RDSInstanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RDS Instance Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="font-semibold">Instance Identifier</dt>
            <dd>{instanceInfo.identifier}</dd>
          </div>
          <div>
            <dt className="font-semibold">Engine</dt>
            <dd>{instanceInfo.engine}</dd>
          </div>
          <div>
            <dt className="font-semibold">Engine Version</dt>
            <dd>{instanceInfo.engineVersion}</dd>
          </div>
          <div>
            <dt className="font-semibold">Instance Class</dt>
            <dd>{instanceInfo.instanceClass}</dd>
          </div>
          <div>
            <dt className="font-semibold">Status</dt>
            <dd>{instanceInfo.status}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
