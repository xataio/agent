'use client';

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@xata.io/components';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/schema';
import { CollectInfo as CollectInfoType, getCollectInfo } from './actions';
import { ExtensionsCard } from './extensions-card';
import { PerformanceSettingsCard } from './settings-card';
import { TablesCard } from './tables-card';
import { VacuumSettingsCard } from './vacuum-card';

interface CollectInfoProps {
  connections: Connection[];
}

export function CollectInfo({ connections }: CollectInfoProps) {
  const [isCollecting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const defaultConnection = connections.find((c) => c.isDefault);
  const [selectedConnection, setSelectedConnection] = useState<Connection | undefined>(defaultConnection);
  const [refreshKey, setRefreshKey] = useState(0);
  const [collectData, setCollectData] = useState<CollectInfoType | null>(null);

  useEffect(() => {
    const fetchExistingInfo = async () => {
      if (selectedConnection) {
        const result = await getCollectInfo(selectedConnection);
        if (result.success && result.data) {
          setCollectData(result.data);
          setShowInfo(true);
          setRefreshKey((prevKey) => prevKey + 1);
        }
        if (result.success && !result.data) {
          setShowInfo(false);
          setCollectData(null);
          setRefreshKey((prevKey) => prevKey + 1);
        }
        if (!result.success) {
          toast(`Error: ${result.message}`);
        }
      }
    };
    void fetchExistingInfo();
  }, [selectedConnection]);

  const handleCollectInfo = async () => {
    if (selectedConnection) {
      const result = await getCollectInfo(selectedConnection);
      if (result.success && result.data) {
        setCollectData(result.data);
      }
    }
    setShowInfo(true);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <>
      <p className="text-foreground mb-4 text-sm">
        I will collect some basic information about your database, but connecting to it and running a few queries. These
        queries are strictly read-only and they won&apos;t affect the performance of your database. Click on the button
        below to start the collection process.
      </p>
      <div className="flex space-x-4">
        <Select
          onValueChange={(id) => {
            const conn = connections.find((c) => c.id.toString() === id);
            setSelectedConnection(conn);
          }}
          defaultValue={connections.find((c) => c.isDefault)?.id.toString()}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id.toString()}>
                {conn.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCollectInfo} disabled={!selectedConnection}>
          {isCollecting ? 'Collecting...' : showInfo ? 'Refresh Info' : 'Collect Info'}
        </Button>
      </div>
      {showInfo && (
        <div className="space-y-6 pt-6">
          <TablesCard
            key={`tables-${refreshKey}`}
            selectedConnection={selectedConnection}
            initialData={collectData?.tables}
          />
          <ExtensionsCard
            key={`extensions-${refreshKey}`}
            selectedConnection={selectedConnection}
            initialData={collectData?.extensions}
          />
          <PerformanceSettingsCard
            key={`performance-${refreshKey}`}
            selectedConnection={selectedConnection}
            initialData={collectData?.performance_settings}
          />
          <VacuumSettingsCard
            key={`vacuum-${refreshKey}`}
            selectedConnection={selectedConnection}
            initialData={collectData?.vacuum_settings}
          />
          {/* <AIInsightsCard key={`ai-insights-${refreshKey}`} /> */}
        </div>
      )}
    </>
  );
}
