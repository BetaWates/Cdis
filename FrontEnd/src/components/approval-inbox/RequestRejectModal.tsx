import React from 'react';

interface RequestRejectModalProps {
  isOpen: boolean;
  remark: string;
  setRemark: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Modal extracted from ApprovalInboxView. Opens when a submitter requests rejection of their own submission. */
export function RequestRejectModal({ isOpen, remark, setRemark, onSubmit, onCancel }: RequestRejectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="text-base font-semibold text-[#191c1d]">Request Reject</h3>
        <p className="text-sm text-[#757682]">
          Provide a reason for requesting rejection. This will be visible to all approvers.
        </p>
        <textarea
          className="w-full border border-[#c5c5d3] rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00236f]"
          rows={4}
          placeholder="State the reason for reject request..."
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#c5c5d3] text-sm text-[#444651] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
