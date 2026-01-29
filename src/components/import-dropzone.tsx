'use client';

import { useState, useCallback } from 'react';

interface ImportResult {
  success: boolean;
  executions: {
    parsed: number;
    inserted: number;
    skipped: number;
    errors: string[];
  };
  trades: {
    matched: number;
    errors: string[];
  };
  parseErrors: string[];
}

interface ImportDropzoneProps {
  onImportComplete?: (result: ImportResult) => void;
}

export function ImportDropzone({ onImportComplete }: ImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const xmlFile = files.find(f => f.name.endsWith('.xml'));

    if (!xmlFile) {
      setError('Please drop an XML file');
      return;
    }

    await uploadFile(xmlFile);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);
      onImportComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-400">Importing...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <UploadIcon className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <p className="text-white font-medium">Drop IBKR Flex XML here</p>
                <p className="text-sm text-zinc-500 mt-1">or click to browse</p>
              </div>
            </div>
            <input
              type="file"
              accept=".xml"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckIcon className="w-5 h-5" />
            <span className="font-medium">Import Complete</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Executions Parsed</p>
              <p className="text-white font-medium">{result.executions.parsed}</p>
            </div>
            <div>
              <p className="text-zinc-500">New Executions</p>
              <p className="text-white font-medium">{result.executions.inserted}</p>
            </div>
            <div>
              <p className="text-zinc-500">Skipped (duplicates)</p>
              <p className="text-zinc-400">{result.executions.skipped}</p>
            </div>
            <div>
              <p className="text-zinc-500">Trades Matched</p>
              <p className="text-white font-medium">{result.trades.matched}</p>
            </div>
          </div>

          {(result.executions.errors.length > 0 || result.parseErrors.length > 0) && (
            <div className="pt-3 border-t border-zinc-700">
              <p className="text-amber-400 text-sm">
                {result.executions.errors.length + result.parseErrors.length} warnings
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
