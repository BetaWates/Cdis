import { useState } from 'react';
import { DailyCheckSubmission } from '../types';
import { ApprovalList } from './approval-inbox/ApprovalList';
import { ApprovalDetail } from './approval-inbox/ApprovalDetail';
import { RequestRejectModal } from './approval-inbox/RequestRejectModal';

interface ApprovalInboxViewProps {
  submissions: DailyCheckSubmission[];
  pendingCounts: { pic: number; leader: number; spv: number; manager: number };
  onAdvanceApproval: (id: string, reviewer: string, notes: string) => Promise<void>;
  onApproveException: (id: string, reviewer: string, notes: string) => Promise<void>;
  onRejectSubmission: (id: string, reviewer: string, notes: string) => Promise<void>;
  onRequestReject: (id: string, reviewer: string, remark: string) => void;
  inspectorName: string;
}

/**
 * Orchestrator for the Approval Inbox feature.
 * Owns viewState, selectedSubmission, reviewNotes, and modal state.
 * Replaced 1,235-line god component with ~80-line orchestrator + 7 focused sub-components.
 */
export default function ApprovalInboxView({
  submissions,
  pendingCounts,
  onAdvanceApproval,
  onApproveException,
  onRejectSubmission,
  onRequestReject,
  inspectorName,
}: ApprovalInboxViewProps) {
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedSubmission, setSelectedSubmission] = useState<DailyCheckSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [showRequestRejectModal, setShowRequestRejectModal] = useState(false);
  const [requestRejectRemark, setRequestRejectRemark] = useState('');

  const handleOpenDetail = (submission: DailyCheckSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.reviewNotes || '');
    setViewState('detail');
  };

  const handleActionCompleted = () => {
    setViewState('list');
    setSelectedSubmission(null);
    setReviewNotes('');
  };

  const handleAdvance = async () => {
    if (!selectedSubmission || isReviewing) return;
    try {
      setIsReviewing(true);
      await onAdvanceApproval(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Inspection checksheet approved and advanced to next stage.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Advance failed:', err);
      alert('Failed to advance approval. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApproveWaiver = async () => {
    if (!selectedSubmission || isReviewing) return;
    try {
      setIsReviewing(true);
      await onApproveException(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Deviation approved as exception. Checksheet status is now set to APPROVED EXCEPTION.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Waiver failed:', err);
      alert('Failed to approve waiver. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || isReviewing) return;
    if (!reviewNotes.trim()) {
      alert('Review Notes with corrective action is strictly required before rejecting checksheet!');
      return;
    }
    try {
      setIsReviewing(true);
      await onRejectSubmission(selectedSubmission.id, inspectorName, reviewNotes);
      alert('Inspection checksheet rejected and returned to technical line operator for rework.');
      handleActionCompleted();
    } catch (err) {
      console.error('[ApprovalInboxView] Reject failed:', err);
      alert('Failed to reject submission. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRequestReject = () => {
    if (!requestRejectRemark.trim()) {
      alert('Remark / reason is required before submitting a reject request.');
      return;
    }
    if (!selectedSubmission) return;
    onRequestReject(selectedSubmission.id, inspectorName, requestRejectRemark);
    setShowRequestRejectModal(false);
    setRequestRejectRemark('');
    setSelectedSubmission(null);
    alert('Reject request submitted. Approver will review and action.');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8f9fa]">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">

        {viewState === 'list' && (
          <ApprovalList
            submissions={submissions}
            pendingCounts={pendingCounts}
            onOpenDetail={handleOpenDetail}
          />
        )}

        {viewState === 'detail' && selectedSubmission && (
          <ApprovalDetail
            submission={selectedSubmission}
            inspectorName={inspectorName}
            reviewNotes={reviewNotes}
            setReviewNotes={setReviewNotes}
            isReviewing={isReviewing}
            onAdvance={handleAdvance}
            onReject={handleReject}
            onApproveWaiver={handleApproveWaiver}
            onRequestReject={() => setShowRequestRejectModal(true)}
            onBack={() => { setViewState('list'); setSelectedSubmission(null); setReviewNotes(''); }}
          />
        )}

      </div>

      <RequestRejectModal
        isOpen={showRequestRejectModal}
        remark={requestRejectRemark}
        setRemark={setRequestRejectRemark}
        onSubmit={handleRequestReject}
        onCancel={() => { setShowRequestRejectModal(false); setRequestRejectRemark(''); }}
      />
    </div>
  );
}
