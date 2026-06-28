import { useState } from 'react';
import { DailyCheckSubmission, MasterForm } from '../types';
import { ChecksheetSelector } from './daily-checks/ChecksheetSelector';
import { MeasurementEntrySheet } from './daily-checks/MeasurementEntrySheet';

interface DailyChecksViewProps {
  masterForms: MasterForm[];
  onAddSubmission: (submission: DailyCheckSubmission) => void;
  inspectorName: string;
}

/**
 * Orchestrator for the Daily Checks feature.
 * Owns only viewState, selectedForm, sampleId, and barcode-scanner state.
 * Replaced 944-line god component with ~70-line orchestrator + 3 focused sub-components.
 */
export default function DailyChecksView({ masterForms, onAddSubmission, inspectorName }: DailyChecksViewProps) {
  const [viewState, setViewState] = useState<'select' | 'entry'>('select');
  const [selectedForm, setSelectedForm] = useState<MasterForm | null>(null);
  const [sampleId, setSampleId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'form' | 'sample'>('form');

  const handleStartCheck = (form: MasterForm) => {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    setSampleId(
      `#${new Date().getFullYear()}-${form.partNumber.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}-${randomNum}`
    );
    setSelectedForm(form);
    setViewState('entry');
  };

  const handleScan = (scannedValue: string) => {
    if (scannerMode === 'form') {
      const activeForms = masterForms.filter((f) => f.status === 'ACTIVE');
      const matchedForm = activeForms.find(
        (f) =>
          f.partNumber.toLowerCase() === scannedValue.toLowerCase() ||
          f.modelName.toLowerCase() === scannedValue.toLowerCase()
      );
      if (matchedForm) {
        handleStartCheck(matchedForm);
      } else {
        alert(`No active checksheet found matching barcode value: "${scannedValue}"`);
      }
    } else {
      setSampleId(scannedValue);
      alert(`Sample ID updated to: "${scannedValue}"`);
    }
    setShowScanner(false);
  };

  if (viewState === 'select') {
    return (
      <ChecksheetSelector
        masterForms={masterForms}
        onStartCheck={handleStartCheck}
        onScanForm={() => { setScannerMode('form'); setShowScanner(true); }}
      />
    );
  }

  if (viewState === 'entry' && selectedForm) {
    return (
      <MeasurementEntrySheet
        selectedForm={selectedForm}
        sampleId={sampleId}
        inspectorName={inspectorName}
        onAddSubmission={onAddSubmission}
        onBack={() => { setViewState('select'); setSelectedForm(null); }}
        onScanSample={() => { setScannerMode('sample'); setShowScanner(true); }}
        masterForms={masterForms}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        scannerMode={scannerMode}
        onScan={handleScan}
      />
    );
  }

  return null;
}
