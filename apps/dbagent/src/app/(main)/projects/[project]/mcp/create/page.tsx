'use client';

import { Button } from '@internal/components';
import { UploadIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function CreateMcpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (!file.name.endsWith('.ts')) {
      setError('Only TypeScript (.ts) files are allowed');
      return false;
    }
    setError(null);
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/mcp/servers/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }

      router.back();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create MCP Server</h1>
        <p className="text-muted-foreground mt-2">Upload a TypeScript file to create a new MCP server.</p>
      </div>

      <div className="space-y-6">
        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground'
          } ${error ? 'border-destructive' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <UploadIcon className="text-muted-foreground h-8 w-8" />
            <div className="text-muted-foreground text-sm">
              {file ? (
                <p>Selected file: {file.name}</p>
              ) : (
                <p>Drag and drop a TypeScript file here, or click to select</p>
              )}
            </div>
            <input type="file" accept=".ts" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
              Select File
            </Button>
          </div>
        </div>

        {error && <div className="text-destructive text-center text-sm">{error}</div>}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !file || !!error}>
            {isSubmitting ? 'Uploading...' : 'Upload MCP Server'}
          </Button>
        </div>
      </div>
    </div>
  );
}
