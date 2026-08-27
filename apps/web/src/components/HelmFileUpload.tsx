'use client';

import { CheckCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed';
}

interface HelmFileUploadProps {
  open: boolean;
  onClose: () => void;
  onFilesSelected?: (files: File[]) => void;
}

export default function HelmFileUpload({ open, onClose, onFilesSelected }: HelmFileUploadProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback((file: File) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newItem: UploadItem = {
      id,
      name: file.name,
      progress: 0,
      status: 'uploading',
    };
    setUploads((prev) => [...prev, newItem]);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: 100, status: 'completed' } : u)),
        );
      } else {
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: Math.round(progress) } : u)),
        );
      }
    }, 300);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const arr = Array.from(files);
      onFilesSelected?.(arr);
      arr.forEach(simulateUpload);
    },
    [onFilesSelected, simulateUpload],
  );

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    // Reset input so re-selecting same file works
    if (filePickerRef.current) filePickerRef.current.value = '';
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDropFiles = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const removeUploadById = (id: string) => {
    setUploads((prev) => prev.filter((file) => file.id !== id));
  };

  const activeUploads = uploads.filter((file) => file.status === 'uploading');
  const completedUploads = uploads.filter((file) => file.status === 'completed');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl bg-white shadow-2xl border border-surface-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-800">Upload Files</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drop zone */}
          <div className="p-5">
            <Card
              className={cn(
                'group flex max-h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-3 border-dashed py-6 text-sm shadow-none transition-colors',
                isDragging
                  ? 'border-helm-400 bg-helm-50/50'
                  : 'border-surface-200 hover:bg-surface-50',
              )}
              onClick={() => filePickerRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDropFiles}
            >
              <div className="flex items-center gap-2 text-surface-400">
                <Upload className="size-5" />
                <div>
                  Drop files here or{' '}
                  <span className="text-helm-500 font-medium">browse files</span>
                </div>
              </div>
              <input
                accept="image/png,image/jpeg,image/gif,application/pdf,.csv,.xlsx,.docx,.txt"
                className="hidden"
                multiple
                onChange={onFileInputChange}
                ref={filePickerRef}
                type="file"
              />
              <span className="text-xs text-surface-400">
                Supported: JPG, PNG, GIF, PDF, CSV, XLSX, DOCX, TXT
              </span>
            </Card>
          </div>

          {/* Upload list */}
          {(activeUploads.length > 0 || completedUploads.length > 0) && (
            <div className="px-5 pb-5">
              {activeUploads.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center text-xs font-mono uppercase text-surface-500">
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Uploading ({activeUploads.length})
                  </h2>
                  <div className="divide-y">
                    {activeUploads.map((file) => (
                      <div className="group flex items-center py-3" key={file.id}>
                        <div className="mr-3 grid size-9 shrink-0 place-content-center rounded-lg border bg-surface-50">
                          <FileText className="inline size-4 group-hover:hidden text-surface-400" />
                          <button
                            aria-label="Cancel"
                            className="hidden size-4 p-0 group-hover:inline text-surface-400 hover:text-red-500"
                            onClick={() => removeUploadById(file.id)}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <div className="mb-1 flex w-full flex-col">
                          <div className="flex justify-between gap-2">
                            <span className="select-none text-sm text-surface-700 truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-surface-400 tabular-nums">
                              {file.progress}%
                            </span>
                          </div>
                          <Progress className="mt-1.5 h-1.5" value={file.progress} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeUploads.length > 0 && completedUploads.length > 0 && (
                <Separator className="my-3" />
              )}

              {completedUploads.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center text-xs font-mono uppercase text-surface-500">
                    <CheckCircle className="mr-1.5 size-3.5 text-emerald-500" />
                    Finished ({completedUploads.length})
                  </h2>
                  <div className="divide-y">
                    {completedUploads.map((file) => (
                      <div className="group flex items-center py-3" key={file.id}>
                        <div className="mr-3 grid size-9 shrink-0 place-content-center rounded-lg border bg-surface-50">
                          <FileText className="inline size-4 group-hover:hidden text-surface-400" />
                          <button
                            aria-label="Remove"
                            className="hidden size-4 p-0 group-hover:inline text-surface-400 hover:text-red-500"
                            onClick={() => removeUploadById(file.id)}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <div className="mb-1 flex w-full flex-col">
                          <div className="flex justify-between gap-2">
                            <span className="select-none text-sm text-surface-700 truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-emerald-500 font-medium">
                              Done
                            </span>
                          </div>
                          <Progress className="mt-1.5 h-1.5" value={100} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-100 bg-surface-50/50">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              disabled={activeUploads.length > 0}
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
