'use client';

import { Button } from '@internal/components';
import { UploadCloud } from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';

interface FileUploadProps {
  onFileLoaded: (fileContents: string) => void;
  onError: (message: string) => void;
}

export function FileUpload({ onFileLoaded, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        processFile(file);
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFile = (file: File) => {
    // Check file type
    if (file.type !== 'application/json') {
      onError('Please upload a valid JSON file.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onFileLoaded(event.target.result as string);
      }
    };
    reader.onerror = () => {
      onError('Error reading file.');
    };
    reader.readAsText(file);
  };

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-8 text-center ${
        isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileInput} accept="application/json" className="hidden" />
      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
      <div className="mt-4">
        {fileName ? (
          <p className="text-sm font-medium">
            Uploaded: <span className="font-semibold">{fileName}</span>
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">Drag and drop your GCP credentials JSON file</p>
            <p className="mt-1 text-xs text-gray-500">or</p>
          </>
        )}
      </div>
      <Button variant="outline" onClick={handleButtonClick} className="mt-4" type="button">
        Select File
      </Button>
    </div>
  );
}
