'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId') || '';

  const [type, setType] = useState(questionId ? 'INCORRECT_OR_MISSING_ANSWER' : 'GENERAL_FEEDBACK');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          rating: rating === '' ? null : Number(rating),
          questionId: questionId || null,
          guestName: guestName || null,
          guestEmail: guestEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setFeedbackMsg(data.error || 'Submission failed.');
      } else {
        setStatus('success');
        setFeedbackMsg('Thank you. Your report has been routed to the MedVault editorial team.');
        setMessage('');
      }
    } catch {
      setStatus('error');
      setFeedbackMsg('Network error.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
      <div className="rounded-2xl bg-navy-950 border border-medblue-400/30 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback &amp; Issue Report</h1>
          <p className="text-sm text-blue-200/80 mt-1">
            {questionId
              ? `Reporting an issue linked to Question ID: ${questionId}`
              : 'Help improve MedVault by reporting typos, classification errors, or suggesting features.'}
          </p>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-blue-200 mb-1">Issue Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm"
            >
              <option value="INCORRECT_OR_MISSING_ANSWER">Incorrect or missing answer</option>
              <option value="WRONG_OR_UNCLEAR_EXPLANATION">Wrong or unclear explanation</option>
              <option value="TYPO_OR_FORMATTING">Typo or formatting error</option>
              <option value="WRONG_CLASSIFICATION">Wrong classification</option>
              <option value="FEATURE_SUGGESTION">Feature suggestion</option>
              <option value="BUG_REPORT">Bug report</option>
              <option value="GENERAL_FEEDBACK">General feedback</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-blue-200 mb-1">
              Details * (max 2000 characters)
            </label>
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-blue-200 mb-1">
                Your Name (if guest)
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-blue-200 mb-1">
                Your Email (if guest)
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-blue-200 mb-1">
              Optional Rating (1–5)
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm"
            >
              <option value="">No rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Fair</option>
              <option value="2">2 - Needs work</option>
              <option value="1">1 - Poor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 rounded-full bg-medblue-500 hover:bg-medblue-600 text-white font-semibold text-sm"
          >
            {status === 'loading' ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
