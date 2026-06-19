export type FormStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'PROCESSING';

export interface Specification {
  id: string;
  parameterName: string;
  standardValue: string;
  tolerance: string;
  unit: string;
  isOptional?: boolean;
}

export interface MasterForm {
  id: string;
  modelName: string;
  partNumber: string;
  uploadDate: string;
  status: FormStatus;
  imageUrl: string;
  pdfDataUrl?: string;
  pdfFileName?: string;
  pdfData?: string;
  specifications: Specification[];
}

export type InputMode = 'keypad' | 'voice' | 'handwriting';

export interface MeasurementEntry {
  paramName: string;
  standardValue: string;
  tolerance: string;
  unit: string;
  measuredValue: string;
  status: 'OK' | 'NG' | '--';
  inputMode?: InputMode;
  handwritingData?: string;
}

export interface ActivityLogEntry {
  id: string;
  time: string;
  action: string;
  user: string;
  details: string;
  type: 'start' | 'flag' | 'submit' | 'review' | 'approve' | 'reject';
}

export type ApprovalProgressState = 'APPROVED' | 'CURRENT' | 'PENDING';

export interface DailyCheckSubmission {
  id: string;
  modelId: string;
  modelName: string;
  partNumber: string;
  sampleId: string;
  submitterName: string;
  submitterDept: string;
  submittedDate: string;
  submittedAt?: string;
  status: 'PENDING' | 'APPROVED_EXCEPTION' | 'REJECTED';
  priority: 'HIGH' | 'NORMAL';
  progress: {
    pic: ApprovalProgressState;
    leader: ApprovalProgressState;
    spv: ApprovalProgressState;
    manager: ApprovalProgressState;
  };
  measurements: MeasurementEntry[];
  reviewNotes?: string;
  activityLog: ActivityLogEntry[];
}
