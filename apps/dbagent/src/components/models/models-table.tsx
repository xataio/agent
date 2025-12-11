'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@xata.io/components';
import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface ModelWithSettings {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

const ITEMS_PER_PAGE = 10;

export function ModelsTable() {
  const { project } = useParams<{ project: string }>();
  const [models, setModels] = useState<ModelWithSettings[]>([]);
  const [missingModels, setMissingModels] = useState<ModelWithSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingModels, setUpdatingModels] = useState<Set<string>>(new Set());
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set());

  const loadModels = useCallback(async () => {
    if (!project) return;

    try {
      const response = await fetch(`/api/models?projectId=${project}`);

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data.models);
      setMissingModels(data.missingModels || []);
    } catch (error) {
      console.error('Error loading models:', error);
      setModels([]);
      setMissingModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const handleToggleEnabled = async (model: ModelWithSettings) => {
    if (model.isDefault && model.enabled) {
      // Cannot disable default model
      return;
    }

    setUpdatingModels((prev) => new Set(prev).add(model.id));

    // Optimistic update
    setModels((prevModels) => prevModels.map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m)));

    try {
      const response = await fetch(`/api/models?projectId=${project}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id, enabled: !model.enabled })
      });

      if (!response.ok) {
        // Revert on error
        setModels((prevModels) => prevModels.map((m) => (m.id === model.id ? { ...m, enabled: model.enabled } : m)));
        const errorText = await response.text();
        console.error('Error updating model:', errorText);
      }
    } catch (error) {
      // Revert on error
      setModels((prevModels) => prevModels.map((m) => (m.id === model.id ? { ...m, enabled: model.enabled } : m)));
      console.error('Error updating model:', error);
    } finally {
      setUpdatingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(model.id);
        return newSet;
      });
    }
  };

  const handleSetDefault = async (model: ModelWithSettings) => {
    if (model.isDefault) {
      // Already default
      return;
    }

    setUpdatingModels((prev) => new Set(prev).add(model.id));

    // Optimistic update
    setModels((prevModels) =>
      prevModels.map((m) => ({
        ...m,
        isDefault: m.id === model.id,
        enabled: m.id === model.id ? true : m.enabled // Default model must be enabled
      }))
    );

    try {
      const response = await fetch(`/api/models?projectId=${project}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id, isDefault: true })
      });

      if (!response.ok) {
        // Reload on error to get correct state
        await loadModels();
        const errorText = await response.text();
        console.error('Error setting default model:', errorText);
      }
    } catch (error) {
      // Reload on error
      await loadModels();
      console.error('Error setting default model:', error);
    } finally {
      setUpdatingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(model.id);
        return newSet;
      });
    }
  };

  const handleDeleteMissingModel = async (model: ModelWithSettings) => {
    if (model.isDefault) {
      // Cannot delete default model settings
      return;
    }

    setDeletingModels((prev) => new Set(prev).add(model.id));

    try {
      const response = await fetch(`/api/models?projectId=${project}&modelId=${encodeURIComponent(model.id)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setMissingModels((prev) => prev.filter((m) => m.id !== model.id));
      } else {
        const errorText = await response.text();
        console.error('Error deleting model setting:', errorText);
      }
    } catch (error) {
      console.error('Error deleting model setting:', error);
    } finally {
      setDeletingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(model.id);
        return newSet;
      });
    }
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  const totalPages = Math.ceil(models.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentModels = models.slice(startIndex, endIndex);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Models</h1>
      </div>

      <div className="mb-6">
        <Alert>
          <AlertTitle>Configure available AI models</AlertTitle>
          <AlertDescription>
            Enable or disable models to control which ones appear in the chat model selector. Set a default model that
            will be used for new chats.
          </AlertDescription>
        </Alert>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model Name</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Enabled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {!isLoading && currentModels.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground text-center">
                No models available. Please configure your LLM providers.
              </TableCell>
            </TableRow>
          )}
          {currentModels.map((model) => (
            <TableRow key={model.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{model.name}</span>
                  {model.isDefault && <StarIcon className="h-4 w-4 fill-current text-yellow-500" />}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant={model.isDefault ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSetDefault(model)}
                  disabled={model.isDefault || updatingModels.has(model.id)}
                >
                  {model.isDefault ? 'Default' : 'Set as default'}
                </Button>
              </TableCell>
              <TableCell>
                <Switch
                  checked={model.enabled}
                  onCheckedChange={() => handleToggleEnabled(model)}
                  disabled={model.isDefault || updatingModels.has(model.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {!isLoading && models.length > ITEMS_PER_PAGE && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, models.length)} of {models.length} models
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!isLoading && models.length > 0 && (
        <div className="text-muted-foreground mt-4 text-sm">
          Disabled models will not appear in the chat model selector. The default model cannot be disabled.
        </div>
      )}

      {/* Missing Models Section */}
      {!isLoading && missingModels.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangleIcon className="text-muted-foreground h-5 w-5" />
            <h2 className="text-muted-foreground text-lg font-semibold">Unavailable Models</h2>
          </div>
          <p className="text-muted-foreground mb-4 text-sm">
            These models have saved settings but are no longer available from your providers. You can remove their
            settings to clean up.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Model ID</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missingModels.map((model) => (
                <TableRow key={model.id} className="opacity-60">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{model.name}</span>
                      {model.isDefault && <StarIcon className="h-4 w-4 fill-current text-yellow-500" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {model.isDefault ? 'Default (unavailable)' : model.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMissingModel(model)}
                      disabled={model.isDefault || deletingModels.has(model.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {missingModels.some((m) => m.isDefault) && (
            <div className="text-muted-foreground mt-2 text-sm">
              Note: Cannot remove the default model. Set another available model as default first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
