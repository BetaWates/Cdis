import { useState, useEffect, useCallback } from 'react';
import { DailyCheckSubmission } from '../types';
import { triggerApprovalEmail, getNextStage, ApprovalStage } from '../utils/notifications';

const TOKEN_KEY = 'aiina_auth_token';

function authHeaders(contentType = true): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getCurrentStage(progress: DailyCheckSubmission['progress']): ApprovalStage | null {
  if (progress.pic === 'CURRENT') return 'PIC';
  if (progress.leader === 'CURRENT') return 'LEADER';
  if (progress.spv === 'CURRENT') return 'SPV';
  if (progress.manager === 'CURRENT') return 'MANAGER';
  return null;
}

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<DailyCheckSubmission[]>([]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-checks?limit=50`, {
        headers: authHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('[useSubmissions] Failed to fetch submissions:', err);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const addSubmission = useCallback(async (newSub: DailyCheckSubmission) => {
    try {
      setSubmissions((prev) => [newSub, ...prev]);
      await fetch(`${import.meta.env.VITE_API_URL}/api/daily-checks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newSub)
      });
      triggerApprovalEmail({ submissionId: newSub.id, modelName: newSub.modelName, sampleId: newSub.sampleId, submitterName: newSub.submitterName, currentStage: 'PIC', nextStage: 'PIC' });
    } catch (err) {
      console.error('[useSubmissions] Failed to add submission:', err);
    }
  }, []);

  const advanceApproval = useCallback(async (submissionId: string, reviewerName: string, reviewNotes: string) => {
    try {
      const sub = submissions.find(s => s.id === submissionId);
      if (sub) {
        const currentStage = getCurrentStage(sub.progress);
        if (currentStage) {
          const nextStage = getNextStage(currentStage);
          triggerApprovalEmail({ submissionId, modelName: sub.modelName, sampleId: sub.sampleId, submitterName: sub.submitterName, currentStage, nextStage });
        }
      }

      await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${submissionId}/advance`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reviewerName, reviewNotes })
      });
      fetchSubmissions();
    } catch (err) {
      console.error('[useSubmissions] Failed to advance approval:', err);
    }
  }, [submissions, fetchSubmissions]);

  const rejectSubmission = useCallback(async (submissionId: string, reviewerName: string, reviewNotes: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${submissionId}/reject`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reviewerName, reviewNotes })
      });
      fetchSubmissions();
    } catch (err) {
      console.error('[useSubmissions] Failed to reject submission:', err);
    }
  }, [fetchSubmissions]);

  const requestRejectSubmission = useCallback(async (id: string, requesterName: string, remark: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${id}/request-reject`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ requesterName, remark })
      });
      fetchSubmissions();
    } catch (err) {
      console.error('[useSubmissions] Failed to request reject:', err);
    }
  }, [fetchSubmissions]);

  const approveException = useCallback(async (submissionId: string, reviewerName: string, reviewNotes: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/approvals/${submissionId}/exception`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reviewerName, reviewNotes })
      });
      fetchSubmissions();
    } catch (err) {
      console.error('[useSubmissions] Failed to approve exception:', err);
    }
  }, [fetchSubmissions]);

  const resetToDefaults = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-checks/reset`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        fetchSubmissions();
      }
    } catch (err) {
      console.error('[useSubmissions] Failed to reset submissions:', err);
    }
  }, [fetchSubmissions]);

  const pendingCounts = {
    pic: submissions.filter(s => (s.status === 'PENDING' || s.status === 'REQUEST_REJECT') && s.progress.pic === 'CURRENT').length,
    leader: submissions.filter(s => (s.status === 'PENDING' || s.status === 'REQUEST_REJECT') && s.progress.leader === 'CURRENT').length,
    spv: submissions.filter(s => (s.status === 'PENDING' || s.status === 'REQUEST_REJECT') && s.progress.spv === 'CURRENT').length,
    manager: submissions.filter(s => (s.status === 'PENDING' || s.status === 'REQUEST_REJECT') && s.progress.manager === 'CURRENT').length,
  };

  return { submissions, setSubmissions, addSubmission, advanceApproval, rejectSubmission, requestRejectSubmission, approveException, resetToDefaults, pendingCounts };
}
