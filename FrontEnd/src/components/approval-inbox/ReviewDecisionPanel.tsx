import React from 'react';
import { DailyCheckSubmission } from '../../types';
import { CheckCircle, Ban, ThumbsUp } from 'lucide-react';
import { Button } from '../ui/button';

interface ReviewDecisionPanelProps {
  submission: DailyCheckSubmission;
  inspectorName: string;
  reviewNotes: string;
  setReviewNotes: (v: string) => void;
  isReviewing: boolean;
  onAdvance: () => void;
  onReject: () => void;
  onApproveWaiver: () => void;
  onShowRequestRejectModal: () => void;
}

/**
 * Review decision panel extracted from ApprovalInboxView (original lines 1077–1148).
 * Shows either the active review form (for PENDING / REQUEST_REJECT) or
 * the historical concluded-decision view (for APPROVED / APPROVED_EXCEPTION / REJECTED).
 */
export function ReviewDecisionPanel({
  submission,
  inspectorName,
  reviewNotes,
  setReviewNotes,
  isReviewing,
  onAdvance,
  onReject,
  onApproveWaiver,
  onShowRequestRejectModal,
}: ReviewDecisionPanelProps) {
  const isActionable = submission.status === 'PENDING' || submission.status === 'REQUEST_REJECT';

  if (isActionable) {
    return (
      <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#00236f] m-0">Review Decision</h3>

        <div>
          <label
            className="block text-xs font-bold text-[#444651] mb-1.5"
            htmlFor="review-notes-entry"
          >
            Review Notes / Engineering Corrective Action (Strictly required for rejections)
          </label>
          <textarea
            id="review-notes-entry"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Detail corrective directives, alignment modifications, or machine recalibration logs..."
            rows={3}
            className="w-full text-xs p-3 rounded-lg border border-[#c5c5d3] focus:border-[#00236f] focus:ring-[#00236f] bg-[#f8f9fa] text-slate-800 outline-none resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {submission.status === 'PENDING' &&
            (submission.submitterName === inspectorName ||
              submission.progress.pic === 'CURRENT' ||
              submission.progress.leader === 'CURRENT' ||
              submission.progress.spv === 'CURRENT') && (
              <button
                onClick={onShowRequestRejectModal}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer select-none active:scale-95 mr-auto"
              >
                Request Reject
              </button>
            )}
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isReviewing}
            className="flex items-center gap-1.5 transition-colors"
          >
            <Ban size={14} /> Reject &amp; Return for Recalibration
          </Button>
          <Button
            variant="secondary"
            onClick={onApproveWaiver}
            disabled={isReviewing}
            className="flex items-center gap-1.5 transition-colors border border-[#00236f]/30"
          >
            <ThumbsUp size={14} /> Approve Waiver Exception
          </Button>
          <Button
            variant="default"
            onClick={onAdvance}
            disabled={isReviewing}
            className="flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle size={14} /> Approve &amp; Advance Stage
          </Button>
        </div>
      </section>
    );
  }

  // Historical / concluded state
  return (
    <section className="bg-white border border-[#c5c5d3] rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-[#191c1d] mb-2 flex items-center gap-2">
        <CheckCircle
          className={(submission.status === 'APPROVED' || submission.status === 'APPROVED_EXCEPTION') ? 'text-green-600' : 'text-[#ba1a1a]'}
          size={20}
        />
        Decision Concluded: {submission.status.replace('_', ' ')}
      </h3>
      {submission.reviewNotes && (
        <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs text-slate-700 font-mono mt-2">
          <span className="font-bold text-[#191c1d] block mb-1">Signed Action Directives:</span>
          {submission.reviewNotes}
        </div>
      )}
    </section>
  );
}
