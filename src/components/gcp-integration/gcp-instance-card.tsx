import { CloudSQLInstanceInfo } from '~/lib/gcp/cloudsql';

export function CloudSQLInstanceCard({ instanceInfo }: { instanceInfo: CloudSQLInstanceInfo }) {
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
          <p className="text-sm">{instanceInfo.settings?.tier || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Storage</p>
          <p className="text-sm">{instanceInfo.settings?.dataDiskSizeGb || '0'} GB</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">High Availability</p>
          <p className="text-sm">{instanceInfo.settings?.availabilityType || '-'}</p>
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
