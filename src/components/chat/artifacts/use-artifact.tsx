'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { UIArtifact } from './artifact';

export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  kind: 'text',
  title: '',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0
  }
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  const { data: localArtifact } = useQuery<UIArtifact>({
    queryKey: ['artifact'],
    queryFn: () => initialArtifactData,
    staleTime: Infinity
  });

  const selectedValue = useMemo(() => {
    return selector(localArtifact ?? initialArtifactData);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact() {
  const queryClient = useQueryClient();

  const { data: artifact = initialArtifactData } = useQuery<UIArtifact>({
    queryKey: ['artifact'],
    queryFn: () => initialArtifactData,
    staleTime: Infinity
  });

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((current: UIArtifact) => UIArtifact)) => {
      queryClient.setQueryData<UIArtifact>(['artifact'], (currentArtifact) => {
        const current = currentArtifact ?? initialArtifactData;
        return typeof updaterFn === 'function' ? updaterFn(current) : updaterFn;
      });
    },
    [queryClient]
  );

  const { data: metadata } = useQuery<any>({
    queryKey: artifact.documentId ? ['artifact-metadata', artifact.documentId] : [],
    queryFn: () => null,
    enabled: !!artifact.documentId,
    staleTime: Infinity
  });

  const setMetadata = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    (newMetadata: any | ((current: any) => any)) => {
      if (!artifact.documentId) return;
      queryClient.setQueryData(['artifact-metadata', artifact.documentId], (currentMetadata) => {
        return typeof newMetadata === 'function' ? newMetadata(currentMetadata) : newMetadata;
      });
    },
    [artifact.documentId, queryClient]
  );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata,
      setMetadata
    }),
    [artifact, setArtifact, metadata, setMetadata]
  );
}
