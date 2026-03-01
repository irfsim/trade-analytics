'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isOpen]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setScreenshot(null);
      setScreenshotPreview(null);
      setDragOver(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  // Paste listener (document-level while open)
  useEffect(() => {
    if (!isOpen) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            attachScreenshot(file);
          }
          break;
        }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const attachScreenshot = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }, [screenshotPreview]);

  function removeScreenshot() {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(null);
    setScreenshotPreview(null);
  }

  async function handleSubmit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }
      const res = await fetch('/api/feedback', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send feedback');
      }
      toast.success('Feedback sent — thank you!');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
        className="relative bg-white dark:bg-zinc-900 shadow-xl rounded-xl w-full max-w-lg mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">Share Feedback</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Close feedback"
          >
            <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind? Bug reports, feature ideas, or anything else..."
            className="w-full min-h-[120px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 placeholder:text-zinc-400"
          />

          {/* Screenshot drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) attachScreenshot(file);
            }}
            className={`mt-3 rounded-lg border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50'
                : 'border-zinc-200 dark:border-zinc-700'
            } ${screenshotPreview ? 'p-2' : 'h-24 flex items-center justify-center'}`}
          >
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="max-h-32 rounded-lg"
                />
                <button
                  onClick={removeScreenshot}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                  aria-label="Remove screenshot"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Paste or drag a screenshot
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="px-4 h-9 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
