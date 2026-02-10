'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-sm p-6 rounded-xl shadow-card text-center" style={{ background: 'var(--card-bg)' }}>
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34, 197, 94, 0.15)' }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--success)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            Check your email
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            We sent a password reset link to {email}
          </p>
          <Link
            href="/login"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm p-6 rounded-xl shadow-card" style={{ background: 'var(--card-bg)' }}>
        <h1 className="text-2xl font-semibold text-center mb-2" style={{ color: 'var(--foreground)' }}>
          Reset password
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
          Enter your email and we&apos;ll send you a reset link
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                background: 'var(--muted-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--card-border)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full font-medium text-sm transition-all disabled:opacity-50 btn-press"
            style={{
              background: 'var(--foreground)',
              color: 'var(--background)',
            }}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm transition-colors hover:underline"
            style={{ color: 'var(--muted)' }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
