import { useState, useEffect, useCallback } from 'react';
import { DailyCheckSubmission, ApprovalProgressState } from '../types';
import { INITIAL_SUBMISSIONS } from '../data';
import { triggerApprovalEmail, getNextStage, ApprovalStage } from '../utils/notifications';

const STORAGE_KEY = 'industrial_qc_submissions_v1';

function getCurrentStage(progress: DailyCheckSubmission['progress']): ApprovalStage | null {
  if (progress.pic === 'CURRENT') return 'PIC';
  if (progress.leader === 'CURRENT') return 'LEADER';
  if (progress.spv === 'CURRENT') return 'SPV';
  if (progress.manager === 'CURRENT') return 'MANAGER';
  return null;
}

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<DailyCheckSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    } catch { return INITIAL_SUBMISSIONS; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  }, [submissions]);

  const addSubmission = useCallback((newSub: DailyCheckSubmission) => {
    setSubmissions((prev) => [newSub, ...prev]);
    triggerApprovalEmail({ submissionId: newSub.id, modelName: newSub.modelName, sampleId: newSub.sampleId, submitterName: newSub.submitterName, currentStage: 'PIC', nextStage: 'PIC' });
  }, []);

  const advanceApproval = useCallback((submissionId: string, reviewerName: string, reviewNotes: string) => {
    setSubmissions((prev) => prev.map((s) => {
      if (s.id !== submissionId) return s;
      const currentStage = getCurrentStage(s.progress);
      if (!currentStage) return s;
      const nextStage = getNextStage(currentStage);
      const newProgress = { ...s.progress };
      newProgress[currentStage.toLowerCase() as keyof typeof newProgress] = 'APPROVED' as ApprovalProgressState;
      if (nextStage) newProgress[nextStage.toLowerCase() as keyof typeof newProgress] = 'CURRENT' as ApprovalProgressState;
      triggerApprovalEmail({ submissionId: s.id, modelName: s.modelName, sampleId: s.sampleId, submitterName: s.submitterName, currentStage, nextStage });
      return {
        ...s, progress: newProgress, reviewNotes,
        status: !nextStage ? 'APPROVED_EXCEPTION' as const : s.status,
        activityLog: [...s.activityLog, { id: `al-${Date.now()}`, time: 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: `Approved by ${currentStage}`, user: reviewerName, details: reviewNotes || `${currentStage} stage approved.`, type: 'approve' as const }],
      };
    }));
  }, []);

  const rejectSubmission = useCallback((submissionId: string, reviewerName: string, reviewNotes: string) => {
    setSubmissions((prev) => prev.map((s) => {
      if (s.id !== submissionId) return s;
      return {
        ...s, status: 'REJECTED' as const, reviewNotes,
        progress: { pic: 'PENDING' as const, leader: 'PENDING' as const, spv: 'PENDING' as const, manager: 'PENDING' as const },
        activityLog: [...s.activityLog, { id: `al-${Date.now()}`, time: 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Rejected & Returned', user: reviewerName, details: reviewNotes, type: 'reject' as const }],
      };
    }));
  }, []);

  const approveException = useCallback((submissionId: string, reviewerName: string, reviewNotes: string) => {
    setSubmissions((prev) => prev.map((s) => {
      if (s.id !== submissionId) return s;
      return {
        ...s, status: 'APPROVED_EXCEPTION' as const, reviewNotes,
        progress: { pic: 'APPROVED' as const, leader: 'APPROVED' as const, spv: 'APPROVED' as const, manager: 'APPROVED' as const },
        activityLog: [...s.activityLog, { id: `al-${Date.now()}`, time: 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Deviation Approved', user: reviewerName, details: reviewNotes || 'Approved as minor exception.', type: 'approve' as const }],
      };
    }));
  }, []);

  const resetToDefaults = useCallback(() => setSubmissions(INITIAL_SUBMISSIONS), []);

  const pendingCounts = {
    pic: submissions.filter(s => s.status === 'PENDING' && s.progress.pic === 'CURRENT').length,
    leader: submissions.filter(s => s.status === 'PENDING' && s.progress.leader === 'CURRENT').length,
    spv: submissions.filter(s => s.status === 'PENDING' && s.progress.spv === 'CURRENT').length,
    manager: submissions.filter(s => s.status === 'PENDING' && s.progress.manager === 'CURRENT').length,
  };

  return { submissions, setSubmissions, addSubmission, advanceApproval, rejectSubmission, approveException, resetToDefaults, pendingCounts };
}
