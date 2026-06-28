const getPastDateStr = (hoursAgo: number): string => {
  const d = new Date(Date.now() - hoursAgo * 3600 * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getPastIso = (hoursAgo: number): string => {
  const d = new Date(Date.now() - hoursAgo * 3600 * 1000);
  return d.toISOString();
};

export const INITIAL_MASTER_FORMS = [
  {
    id: 'f-1',
    modelName: 'AIR CLEANER ASSY TYPE-A',
    partNumber: 'AC-17210-5LA-000',
    uploadDate: 'Jun 20, 2026',
    status: 'ACTIVE',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQB9fuWG6sU5Pmvv6mHj2G3UEB6xgV8qB5fAoPYff17YYvnBL9lh-jtoecg269YmsL8N6rKmBVnZYDt5rSS-IjMk28MlxpmfSX5PnKcLJveXt04CSz_TETbhc_6CFvzfBRjJNwjkm8U-Z-xWy3TmL9LKb28Gn7atfGwvHkO0JvD4uskcrN7j5YH02M8IHz6p9FD1Dt0hSIrHuf3nKGcqVMfETXbaHbZ9UbGeziP9bk2sTGHco54M9MA0EVQjOtdHpgIQxkZK_f09w',
    specifications: [
      { id: 's-11', parameterName: 'Filter Weight', standardValue: '250.0', tolerance: '±10.0', unit: 'g' },
      { id: 's-12', parameterName: 'Pressure Drop', standardValue: '120', tolerance: '±15', unit: 'Pa' },
      { id: 's-13', parameterName: 'Flow Rate', standardValue: '15.0', tolerance: '±0.5', unit: 'm³/min' },
      { id: 's-14', parameterName: 'Housing Gap', standardValue: '1.50', tolerance: '±0.20', unit: 'mm' },
      { id: 's-15', parameterName: 'Seal Thickness', standardValue: '3.00', tolerance: '±0.15', unit: 'mm' }
    ]
  },
  {
    id: 'f-2',
    modelName: 'AIR CLEANER ASSY TYPE-B',
    partNumber: 'AC-17210-6BA-000',
    uploadDate: 'Jun 21, 2026',
    status: 'ACTIVE',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU06bld5LE59ELcDwrp4voS-Q2GTtbwgRGivvk9NRi1TrvP0hoTvyyGHsgxOAnEoTp_Bx5j8GHZwF1WflvXWLFBB2MbYwtaY55L_7j-Ng6INAYyny6S4xzYgYi59Hmtlxgl_SVHDMLxjpUEHdBHeKASfhWl_bK9iu3FiJk2DD9h0-UM03acNWuLwFuDmrFHt_KZY6ceSdnlD2nAHDWN5Q-XiT0Rob6IaPHWHb5p1tO6vV9YlWypvfwMb5tvbwJElu0Z6CynJ8D9Ls',
    specifications: [
      { id: 's-21', parameterName: 'Filter Weight', standardValue: '275.0', tolerance: '±12.0', unit: 'g' },
      { id: 's-22', parameterName: 'Pressure Drop', standardValue: '135', tolerance: '±15', unit: 'Pa' },
      { id: 's-23', parameterName: 'Flow Rate', standardValue: '18.0', tolerance: '±0.6', unit: 'm³/min' },
      { id: 's-24', parameterName: 'Housing Gap', standardValue: '1.80', tolerance: '±0.25', unit: 'mm' }
    ]
  },
  {
    id: 'f-3',
    modelName: 'AIR CLEANER ASSY TYPE-C',
    partNumber: 'AC-17210-7CA-000',
    uploadDate: 'Jun 22, 2026',
    status: 'ACTIVE',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKVz_dENGj1_bx0ePU-ZMTlAAJkdc6paOqoUS2b-9s3rGapm1VoF34PyQcqMAFYlxU_QXM8l4VvVDZ5StAD9eqRi2U0rSrtSTafQzamNoIjeNzV0iWuwWB_8VEGbif3uP70vA3Ez5_fAzXgBvcbwcPBaZMdW0x680uK0uXMaasgaphmh56x0nI1OQFF1PYObc1SMcvzuGrpa0V8jcLuTZnrpb943Sx-nWiIJ6Z6dHBY-5AD423a4VfmjS-SvoP4eV-RZwnP3clrWo',
    specifications: [
      { id: 's-31', parameterName: 'Filter Weight', standardValue: '310.0', tolerance: '±15.0', unit: 'g' },
      { id: 's-32', parameterName: 'Pressure Drop', standardValue: '150', tolerance: '±20', unit: 'Pa' },
      { id: 's-33', parameterName: 'Flow Rate', standardValue: '22.0', tolerance: '±1.0', unit: 'm³/min' },
      { id: 's-34', parameterName: 'Housing Gap', standardValue: '2.00', tolerance: '±0.30', unit: 'mm' }
    ]
  }
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'chk-1',
    modelId: 'f-1',
    modelName: 'AIR CLEANER ASSY TYPE-A',
    partNumber: 'AC-17210-5LA-000',
    sampleId: '#2026-AC-A01',
    submitterName: 'Andi Pratama',
    submitterDept: 'QC Dept',
    submittedDate: getPastDateStr(4),
    submittedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    status: 'PENDING',
    priority: 'NORMAL',
    progress: { pic: 'CURRENT', leader: 'PENDING', spv: 'PENDING', manager: 'PENDING' },
    measurements: [
      { paramName: 'Filter Weight', standardValue: '250.0', tolerance: '±10.0', unit: 'g', measuredValue: '252.3 | 248.7 | 251.0', status: 'OK', shiftIValue: '252.3', shiftIStatus: 'OK', shiftIIValue: '248.7', shiftIIStatus: 'OK', shiftIIIValue: '251.0', shiftIIIStatus: 'OK' },
      { paramName: 'Pressure Drop', standardValue: '120', tolerance: '±15', unit: 'Pa', measuredValue: '122 | 118 | 125', status: 'OK', shiftIValue: '122', shiftIStatus: 'OK', shiftIIValue: '118', shiftIIStatus: 'OK', shiftIIIValue: '125', shiftIIIStatus: 'OK' },
      { paramName: 'Flow Rate', standardValue: '15.0', tolerance: '±0.5', unit: 'm³/min', measuredValue: '15.1 | 14.8 | 15.4', status: 'OK', shiftIValue: '15.1', shiftIStatus: 'OK', shiftIIValue: '14.8', shiftIIStatus: 'OK', shiftIIIValue: '15.4', shiftIIIStatus: 'OK' },
      { paramName: 'Housing Gap', standardValue: '1.50', tolerance: '±0.20', unit: 'mm', measuredValue: '1.45 | 1.85 | 1.52', status: 'NG', shiftIValue: '1.45', shiftIStatus: 'OK', shiftIIValue: '1.85', shiftIIStatus: 'NG', shiftIIIValue: '1.52', shiftIIIStatus: 'OK' },
      { paramName: 'Seal Thickness', standardValue: '3.00', tolerance: '±0.15', unit: 'mm', measuredValue: '3.05 | 2.98 | 3.02', status: 'OK', shiftIValue: '3.05', shiftIStatus: 'OK', shiftIIValue: '2.98', shiftIIStatus: 'OK', shiftIIIValue: '3.02', shiftIIIStatus: 'OK' }
    ],
    activityLog: [
      { id: 'al-11', timestamp: getPastIso(5), action: 'Inspection Started', user: 'Andi Pratama', details: 'QC Line check sequence initiated.', type: 'start' },
      { id: 'al-12', timestamp: getPastIso(4.5), action: 'NG Flagged', user: 'System', details: 'Housing Gap out of tolerance limit (1.85 mm).', type: 'flag' },
      { id: 'al-13', timestamp: getPastIso(4), action: 'Submitted for Review', user: 'Andi Pratama', details: 'Form submitted to Line Leader.', type: 'submit' }
    ]
  },
  {
    id: 'chk-2',
    modelId: 'f-2',
    modelName: 'AIR CLEANER ASSY TYPE-B',
    partNumber: 'AC-17210-6BA-000',
    sampleId: '#2026-AC-B02',
    submitterName: 'Budi Santoso',
    submitterDept: 'Production Dept',
    submittedDate: getPastDateStr(26),
    submittedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    status: 'PENDING',
    priority: 'NORMAL',
    progress: { pic: 'APPROVED', leader: 'CURRENT', spv: 'PENDING', manager: 'PENDING' },
    measurements: [
      { paramName: 'Filter Weight', standardValue: '275.0', tolerance: '±12.0', unit: 'g', measuredValue: '276.5 | 273.1 | 274.8', status: 'OK', shiftIValue: '276.5', shiftIStatus: 'OK', shiftIIValue: '273.1', shiftIIStatus: 'OK', shiftIIIValue: '274.8', shiftIIIStatus: 'OK' },
      { paramName: 'Pressure Drop', standardValue: '135', tolerance: '±15', unit: 'Pa', measuredValue: '132 | 136 | 130', status: 'OK', shiftIValue: '132', shiftIStatus: 'OK', shiftIIValue: '136', shiftIIStatus: 'OK', shiftIIIValue: '130', shiftIIIStatus: 'OK' },
      { paramName: 'Flow Rate', standardValue: '18.0', tolerance: '±0.6', unit: 'm³/min', measuredValue: '18.1 | 17.9 | 18.2', status: 'OK', shiftIValue: '18.1', shiftIStatus: 'OK', shiftIIValue: '17.9', shiftIIStatus: 'OK', shiftIIIValue: '18.2', shiftIIIStatus: 'OK' },
      { paramName: 'Housing Gap', standardValue: '1.80', tolerance: '±0.25', unit: 'mm', measuredValue: '1.75 | 1.82 | 1.78', status: 'OK', shiftIValue: '1.75', shiftIStatus: 'OK', shiftIIValue: '1.82', shiftIIStatus: 'OK', shiftIIIValue: '1.78', shiftIIIStatus: 'OK' }
    ],
    activityLog: [
      { id: 'al-21', timestamp: getPastIso(27), action: 'Inspection Started', user: 'Budi Santoso', details: 'Production verification sequence initiated.', type: 'start' },
      { id: 'al-22', timestamp: getPastIso(26), action: 'Submitted for Review', user: 'Budi Santoso', details: 'Inspection checks finished and submitted.', type: 'submit' }
    ]
  },
  {
    id: 'chk-3',
    modelId: 'f-3',
    modelName: 'AIR CLEANER ASSY TYPE-C',
    partNumber: 'AC-17210-7CA-000',
    sampleId: '#2026-AC-C03',
    submitterName: 'Citra Dewi',
    submitterDept: 'QC Dept',
    submittedDate: getPastDateStr(52),
    submittedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    status: 'APPROVED_EXCEPTION',
    priority: 'HIGH',
    progress: { pic: 'APPROVED', leader: 'APPROVED', spv: 'APPROVED', manager: 'APPROVED' },
    reviewNotes: 'Slight pressure drop exception in Shift I (174 Pa) is accepted due to minimal deviation and downstream filter performance matching specification.',
    measurements: [
      { paramName: 'Filter Weight', standardValue: '310.0', tolerance: '±15.0', unit: 'g', measuredValue: '312.0 | 308.2 | 314.1', status: 'OK', shiftIValue: '312.0', shiftIStatus: 'OK', shiftIIValue: '308.2', shiftIIStatus: 'OK', shiftIIIValue: '314.1', shiftIIIStatus: 'OK' },
      { paramName: 'Pressure Drop', standardValue: '150', tolerance: '±20', unit: 'Pa', measuredValue: '174 | 152 | 148', status: 'NG', shiftIValue: '174', shiftIStatus: 'NG', shiftIIValue: '152', shiftIIStatus: 'OK', shiftIIIValue: '148', shiftIIIStatus: 'OK' },
      { paramName: 'Flow Rate', standardValue: '22.0', tolerance: '±1.0', unit: 'm³/min', measuredValue: '22.1 | 21.8 | 22.4', status: 'OK', shiftIValue: '22.1', shiftIStatus: 'OK', shiftIIValue: '21.8', shiftIIStatus: 'OK', shiftIIIValue: '22.4', shiftIIIStatus: 'OK' },
      { paramName: 'Housing Gap', standardValue: '2.00', tolerance: '±0.30', unit: 'mm', measuredValue: '2.02 | 1.95 | 1.98', status: 'OK', shiftIValue: '2.02', shiftIStatus: 'OK', shiftIIValue: '1.95', shiftIIStatus: 'OK', shiftIIIValue: '1.98', shiftIIIStatus: 'OK' }
    ],
    activityLog: [
      { id: 'al-31', timestamp: getPastIso(54), action: 'Inspection Started', user: 'Citra Dewi', details: 'Initiated check list.', type: 'start' },
      { id: 'al-32', timestamp: getPastIso(53.5), action: 'NG Flagged', user: 'System', details: 'Pressure Drop out of tolerance (174 Pa) in Shift I.', type: 'flag' },
      { id: 'al-33', timestamp: getPastIso(52), action: 'Submitted for Review', user: 'Citra Dewi', details: 'Escalated with waiver request to supervisor.', type: 'submit' },
      { id: 'al-34', timestamp: getPastIso(50), action: 'Approved Exception', user: 'Bambang (QC Spv)', details: 'Approved exception with review notes.', type: 'approve' }
    ]
  },
  {
    id: 'chk-4',
    modelId: 'f-1',
    modelName: 'AIR CLEANER ASSY TYPE-A',
    partNumber: 'AC-17210-5LA-000',
    sampleId: '#2026-AC-A04',
    submitterName: 'Deni Kurniawan',
    submitterDept: 'QC Dept',
    submittedDate: getPastDateStr(14),
    submittedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    status: 'REQUEST_REJECT',
    priority: 'HIGH',
    progress: { pic: 'CURRENT', leader: 'PENDING', spv: 'PENDING', manager: 'PENDING' },
    rejectRequestRemark: 'Sample damaged during test. Values in Shift III are incorrect and require recalibration of tools and rework of checking sheet.',
    measurements: [
      { paramName: 'Filter Weight', standardValue: '250.0', tolerance: '±10.0', unit: 'g', measuredValue: '251.0 | 249.5 | 210.2', status: 'NG', shiftIValue: '251.0', shiftIStatus: 'OK', shiftIIValue: '249.5', shiftIIStatus: 'OK', shiftIIIValue: '210.2', shiftIIIStatus: 'NG' },
      { paramName: 'Pressure Drop', standardValue: '120', tolerance: '±15', unit: 'Pa', measuredValue: '121 | 124 | 95', status: 'NG', shiftIValue: '121', shiftIStatus: 'OK', shiftIIValue: '124', shiftIIStatus: 'OK', shiftIIIValue: '95', shiftIIIStatus: 'NG' },
      { paramName: 'Flow Rate', standardValue: '15.0', tolerance: '±0.5', unit: 'm³/min', measuredValue: '15.0 | 15.1 | 13.5', status: 'NG', shiftIValue: '15.0', shiftIStatus: 'OK', shiftIIValue: '15.1', shiftIIStatus: 'OK', shiftIIIValue: '13.5', shiftIIIStatus: 'NG' },
      { paramName: 'Housing Gap', standardValue: '1.50', tolerance: '±0.20', unit: 'mm', measuredValue: '1.52 | 1.48 | 1.51', status: 'OK', shiftIValue: '1.52', shiftIStatus: 'OK', shiftIIValue: '1.48', shiftIIStatus: 'OK', shiftIIIValue: '1.51', shiftIIIStatus: 'OK' },
      { paramName: 'Seal Thickness', standardValue: '3.00', tolerance: '±0.15', unit: 'mm', measuredValue: '3.01 | 2.99 | 3.00', status: 'OK', shiftIValue: '3.01', shiftIStatus: 'OK', shiftIIValue: '2.99', shiftIIStatus: 'OK', shiftIIIValue: '3.00', shiftIIIStatus: 'OK' }
    ],
    activityLog: [
      { id: 'al-41', timestamp: getPastIso(16), action: 'Inspection Started', user: 'Deni Kurniawan', details: 'Calibration verification initiated.', type: 'start' },
      { id: 'al-42', timestamp: getPastIso(15), action: 'NG Flagged', user: 'System', details: 'Multiple Shift III parameters out of range.', type: 'flag' },
      { id: 'al-43', timestamp: getPastIso(14), action: 'Submitted for Review', user: 'Deni Kurniawan', details: 'Escalated with request for reject and recalibration sequence.', type: 'submit' }
    ]
  }
];
