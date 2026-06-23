import { useState, useEffect, useCallback } from 'react';
import { MasterForm } from '../types';
import { parseExcelFile } from '../utils/excelParser';

export function useMasterForms() {
  const [masterForms, setMasterForms] = useState<MasterForm[]>([]);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms`);
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
      const [parsedSpecs, pdfDataUrl] = await Promise.all([
        parseExcelFile(excelFile),
        pdfFile ? readFileAsDataUrl(pdfFile) : Promise.resolve(undefined),
      ]);
      const pdfData = pdfDataUrl ? pdfDataUrl.split(',')[1] : undefined;
      
      const parsedForm: MasterForm = {
        ...processingForm,
        status: 'ACTIVE',
        specifications: parsedSpecs,
        pdfDataUrl,
        pdfFileName: pdfFile?.name,
        pdfData,
        imageUrl: pdfDataUrl ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQB9fuWG6sU5Pmvv6mHj2G3UEB6xgV8qB5fAoPYff17YYvnBL9lh-jtoecg269YmsL8N6rKmBVnZYDt5rSS-IjMk28MlxpmfSX5PnKcLJveXt04CSz_TETbhc_6CFvzfBRjJNwjkm8U-Z-xWy3TmL9LKb28Gn7atfGwvHkO0JvD4uskcrN7j5YH02M8IHz6p9FD1Dt0hSIrHuf3nKGcqVMfETXbaHbZ9UbGeziP9bk2sTGHco54M9MA0EVQjOtdHpgIQxkZK_f09w',
      };

      // POST to backend live MySQL database
      await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedForm)
      });

      setMasterForms((prev) => prev.map((f) => f.id === formId ? parsedForm : f));
    } catch (err) {
      console.error('[useMasterForms] Parsing failed:', err);
      setMasterForms((prev) => prev.map((f) => f.id === formId ? { ...f, status: 'DRAFT' } : f));
    }
    return formId;
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/master-forms/reset`, { method: 'POST' });
      if (res.ok) {
        fetchForms();
      }
    } catch (err) {
      console.error('[useMasterForms] Failed to reset master forms:', err);
    }
  }, [fetchForms]);

  return { masterForms, setMasterForms, addMasterFormWithParsing, resetToDefaults };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
