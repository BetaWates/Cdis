import React, { useState } from 'react';
import { MasterForm } from '../types';
import { MasterFormsList } from './master-forms/MasterFormsList';
import { MasterFormDetail } from './master-forms/MasterFormDetail';
import { MasterFormUpload } from './master-forms/MasterFormUpload';

interface MasterFormsViewProps {
  masterForms: MasterForm[];
  setMasterForms: React.Dispatch<React.SetStateAction<MasterForm[]>>;
  addMasterFormWithParsing: (params: {
    modelName: string;
    partNumber: string;
    excelFile: File;
    pdfFile: File | null;
  }) => Promise<string>;
}

/**
 * Orchestrator for the Master Forms feature.
 * Owns only viewState and selectedForm — all other state lives in sub-components.
 * Replaced 636-line god component with ~40-line orchestrator + 4 focused sub-components.
 */
export default function MasterFormsView({ masterForms, setMasterForms, addMasterFormWithParsing }: MasterFormsViewProps) {
  const [viewState, setViewState] = useState<'list' | 'detail' | 'upload'>('list');
  const [selectedForm, setSelectedForm] = useState<MasterForm | null>(null);

  const handleOpenDetail = (form: MasterForm) => {
    if (form.status === 'PROCESSING') return;
    setSelectedForm(form);
    setViewState('detail');
  };

  if (viewState === 'detail' && selectedForm) {
    return (
      <MasterFormDetail
        form={selectedForm}
        onBack={() => setViewState('list')}
      />
    );
  }

  if (viewState === 'upload') {
    return (
      <MasterFormUpload
        addMasterFormWithParsing={addMasterFormWithParsing}
        onSuccess={() => setViewState('list')}
      />
    );
  }

  return (
    <MasterFormsList
      masterForms={masterForms}
      onOpenDetail={handleOpenDetail}
      onUpload={() => setViewState('upload')}
    />
  );
}
