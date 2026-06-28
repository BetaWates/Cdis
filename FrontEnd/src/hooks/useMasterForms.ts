import { useState, useEffect, useCallback } from 'react';
import { MasterForm } from '../types';
import { parseExcelFile } from '../utils/excelParser';

const TOKEN_KEY = 'aiina_auth_token';

function authHeaders(contentType = true): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useMasterForms() {
  const [masterForms, setMasterForms] = useState<MasterForm[]>([]);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms`, {
        headers: authHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setMasterForms(data);
      }
    } catch (err) {
      console.error('[useMasterForms] Failed to fetch forms:', err);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const addMasterFormWithParsing = useCallback(async (params: {
    modelName: string; partNumber: string; excelFile: File; pdfFile: File | null;
  }) => {
    const { modelName, partNumber, excelFile, pdfFile } = params;
    const formId = `f-${Date.now()}`;
    const processingForm: MasterForm = {
      id: formId, modelName, partNumber,
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: 'PROCESSING', imageUrl: '', specifications: [],
    };
    setMasterForms((prev) => [processingForm, ...prev]);

    try {
      const parsedSpecs = await parseExcelFile(excelFile);
      let pdfStorageUrl: string | undefined;

      if (pdfFile) {
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/files/upload-pdf`, {
          method: 'POST',
          headers: authHeaders(false),
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error || 'PDF upload failed');
        }
        const { url } = await uploadRes.json();
        pdfStorageUrl = url;
      }

      const parsedForm: MasterForm = {
        ...processingForm,
        status: 'ACTIVE',
        specifications: parsedSpecs,
        pdfDataUrl: pdfStorageUrl,
        pdfFileName: pdfFile?.name,
        imageUrl: pdfStorageUrl ?? '/placeholder-form.svg',
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(parsedForm)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save master form');
      }

      setMasterForms((prev) => prev.map((f) => f.id === formId ? parsedForm : f));
    } catch (err) {
      console.error('[useMasterForms] Parsing failed:', err);
      setMasterForms((prev) => prev.map((f) => f.id === formId ? { ...f, status: 'DRAFT' } : f));
    }
    return formId;
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms/reset`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        fetchForms();
      }
    } catch (err) {
      console.error('[useMasterForms] Failed to reset master forms:', err);
    }
  }, [fetchForms]);

  return { masterForms, setMasterForms, addMasterFormWithParsing, resetToDefaults };
}
