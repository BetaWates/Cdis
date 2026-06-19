import { MasterForm, DailyCheckSubmission } from './types';

export const INITIAL_MASTER_FORMS: MasterForm[] = [
  {
    id: 'f-1',
    modelName: 'Engine Block Assembly Alpha',
    partNumber: 'PN-2023-A849',
    uploadDate: 'Oct 12, 2023',
    status: 'ACTIVE',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQB9fuWG6sU5Pmvv6mHj2G3UEB6xgV8qB5fAoPYff17YYvnBL9lh-jtoecg269YmsL8N6rKmBVnZYDt5rSS-IjMk28MlxpmfSX5PnKcLJveXt04CSz_TETbhc_6CFvzfBRjJNwjkm8U-Z-xWy3TmL9LKb28Gn7atfGwvHkO0JvD4uskcrN7j5YH02M8IHz6p9FD1Dt0hSIrHuf3nKGcqVMfETXbaHbZ9UbGeziP9bk2sTGHco54M9MA0EVQjOtdHpgIQxkZK_f09w',
    specifications: [
      { id: 's-11', parameterName: 'Outer Diameter (Flange)', standardValue: '45.00', tolerance: '±0.02', unit: 'mm' },
      { id: 's-12', parameterName: 'Inner Bore Diameter', standardValue: '22.50', tolerance: '±0.015', unit: 'mm' },
      { id: 's-13', parameterName: 'Overall Length', standardValue: '120.00', tolerance: '±0.10', unit: 'mm' },
      { id: 's-14', parameterName: 'Surface Roughness (Ra)', standardValue: '1.6', tolerance: 'MAX', unit: 'µm' },
      { id: 's-15', parameterName: 'Thread Pitch (M12)', standardValue: '1.75', tolerance: '±0.05', unit: 'mm' },
      { id: 's-16', parameterName: 'Material Hardness', standardValue: '45', tolerance: '±2', unit: 'HRC' },
      { id: 's-17', parameterName: 'Concentricity', standardValue: '0.05', tolerance: 'MAX', unit: 'mm' },
      { id: 's-18', parameterName: 'Coating Thickness (Optional)', standardValue: '-', tolerance: '-', unit: '-', isOptional: true }
    ]
  },
  {
    id: 'f-2',
    modelName: 'Transmission Housing Beta',
    partNumber: 'PN-2023-B112',
    uploadDate: 'Oct 10, 2023',
    status: 'ACTIVE',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU06bld5LE59ELcDwrp4voS-Q2GTtbwgRGivvk9NRi1TrvP0hoTvyyGHsgxOAnEoTp_Bx5j8GHZwF1WflvXWLFBB2MbYwtaY55L_7j-Ng6INAYyny6S4xzYgYi59Hmtlxgl_SVHDMLxjpUEHdBHeKASfhWl_bK9iu3FiJk2DD9h0-UM03acNWuLwFuDmrFHt_KZY6ceSdnlD2nAHDWN5Q-XiT0Rob6IaPHWHb5p1tO6vV9YlWypvfwMb5tvbwJElu0Z6CynJ8D9Ls',
    specifications: [
      { id: 's-21', parameterName: 'Inner Diameter (Shaft)', standardValue: '30.00', tolerance: '±0.01', unit: 'mm' },
      { id: 's-22', parameterName: 'Outer Flange Thickness', standardValue: '8.50', tolerance: '±0.05', unit: 'mm' },
      { id: 's-23', parameterName: 'Mounting Hole Alignment', standardValue: '0.02', tolerance: 'MAX', unit: 'mm' }
    ]
  },
  {
    id: 'f-3',
    modelName: 'Battery Cell Module Gamma',
    partNumber: 'PN-2023-C773',
    uploadDate: 'Oct 08, 2023',
    status: 'DRAFT',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKVz_dENGj1_bx0ePU-ZMTlAAJkdc6paOqoUS2b-9s3rGapm1VoF34PyQcqMAFYlxU_QXM8l4VvVDZ5StAD9eqRi2U0rSrtSTafQzamNoIjeNzV0iWuwWB_8VEGbif3uP70vA3Ez5_fAzXgBvcbwcPBaZMdW0x680uK0uXMaasgaphmh56x0nI1OQFF1PYObc1SMcvzuGrpa0V8jcLuTZnrpb943Sx-nWiIJ6Z6dHBY-5AD423a4VfmjS-SvoP4eV-RZwnP3clrWo',
    specifications: [
      { id: 's-31', parameterName: 'Cell Voltage Variance', standardValue: '3.70', tolerance: '±0.05', unit: 'V' },
      { id: 's-32', parameterName: 'Terminal Width', standardValue: '12.00', tolerance: '±0.10', unit: 'mm' },
      { id: 's-33', parameterName: 'Insulation Resistance', standardValue: '500', tolerance: 'MIN', unit: 'MΩ' }
    ]
  },
  {
    id: 'f-4',
    modelName: 'Suspension Strut Delta',
    partNumber: 'PN-2022-D901',
    uploadDate: 'Nov 15, 2022',
    status: 'ARCHIVED',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMr3RE8lg7sYS7yKQKbGydgibkNqNmBm5qquTJCg8gpB53SzJyPojGLHnpYTF2jrfceL6NvKgZLMX4Z6yAo6WTzqBPwSWdWyszMu8UyzeW0eusrLmYuMNzANQTLf9CLqumy3mflqJ3Ug-ly85da0CqBmOv_pJwNS-OL2x3Frv9Yq_S94BvWJijDk2j-s0IzWVymb5ZbnpCsVoosA5NepSVHAJLhWBvsElfvQ9LIDFaXmy5JVUYNO59i3RVZJAyrMSJbGw2LT5D3C0',
    specifications: [
      { id: 's-41', parameterName: 'Strut Length (Compressed)', standardValue: '320.00', tolerance: '±1.00', unit: 'mm' },
      { id: 's-42', parameterName: 'Piston Rod Diameter', standardValue: '18.00', tolerance: '±0.03', unit: 'mm' }
    ]
  }
];

export const INITIAL_SUBMISSIONS: DailyCheckSubmission[] = [
  {
    id: 'chk-1',
    modelId: 'f-1',
    modelName: 'T-Series Engine',
    partNumber: 'PN-2023-TE91',
    sampleId: '#2023-TE-092',
    submitterName: 'John Doe',
    submitterDept: 'Assembly Dept',
    submittedDate: 'Oct 24, 09:30 AM',
    submittedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 48 hours ago
    status: 'PENDING',
    priority: 'NORMAL',
    progress: { pic: 'APPROVED', leader: 'APPROVED', spv: 'CURRENT', manager: 'PENDING' },
    measurements: [
      { paramName: 'Wall Thickness', standardValue: '5.00', tolerance: '±0.10', unit: 'mm', measuredValue: '5.02', status: 'OK' },
      { paramName: 'Outer Diameter', standardValue: '120.50', tolerance: '±0.25', unit: 'mm', measuredValue: '120.45', status: 'OK' },
      { paramName: 'Inner Bore Alignment', standardValue: '0.00', tolerance: '+0.05', unit: 'mm', measuredValue: '0.01', status: 'OK' },
      { paramName: 'Surface Roughness (Ra)', standardValue: '0.80', tolerance: 'MAX', unit: 'µm', measuredValue: '0.65', status: 'OK' }
    ],
    activityLog: [
      { id: 'al-11', time: 'Oct 24, 09:10 AM', action: 'Inspection Started', user: 'John Doe', details: 'Started checking batch', type: 'start' },
      { id: 'al-12', time: 'Oct 24, 09:30 AM', action: 'Submitted for Review', user: 'John Doe', details: 'Finished data entry and submitted', type: 'submit' }
    ]
  },
  {
    id: 'chk-2',
    modelId: 'f-3',
    modelName: 'X-Chassis V2',
    partNumber: 'PN-2023-XC02',
    sampleId: '#2023-XC-103',
    submitterName: 'Jane Smith',
    submitterDept: 'Chassis Dept',
    submittedDate: 'Oct 24, 08:15 AM',
    submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // 36 hours ago
    status: 'PENDING',
    priority: 'HIGH',
    progress: { pic: 'APPROVED', leader: 'CURRENT', spv: 'PENDING', manager: 'PENDING' },
    measurements: [
      { paramName: 'Joint Gap', standardValue: '2.50', tolerance: '±0.20', unit: 'mm', measuredValue: '2.85', status: 'NG' },
      { paramName: 'Fastener Torque', standardValue: '45.00', tolerance: '±5.00', unit: 'Nm', measuredValue: '42.50', status: 'OK' }
    ],
    activityLog: [
      { id: 'al-21', time: 'Oct 24, 07:50 AM', action: 'Inspection Started', user: 'Jane Smith', details: 'Verification sequence initiated', type: 'start' },
      { id: 'al-22', time: 'Oct 24, 08:05 AM', action: 'NG Flagged', user: 'System', details: 'Joint Gap (2.85mm) exceeded limit.', type: 'flag' },
      { id: 'al-23', time: 'Oct 24, 08:15 AM', action: 'Submitted for Review', user: 'Jane Smith', details: 'Escalated exception for engineering review', type: 'submit' }
    ]
  },
  {
    id: 'chk-3',
    modelId: 'f-2',
    modelName: 'Door Panel A',
    partNumber: 'PN-2023-DP01',
    sampleId: '#2023-DP-441',
    submitterName: 'Mike Johnson',
    submitterDept: 'Paint Shop',
    submittedDate: 'Oct 23, 04:45 PM',
    submittedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 72 hours ago
    status: 'PENDING',
    priority: 'NORMAL',
    progress: { pic: 'APPROVED', leader: 'APPROVED', spv: 'APPROVED', manager: 'CURRENT' },
    measurements: [
      { paramName: 'Paint Thickness', standardValue: '120', tolerance: '±20', unit: 'µm', measuredValue: '125', status: 'OK' },
      { paramName: 'Color Consistency (Delta E)', standardValue: '1.0', tolerance: 'MAX', unit: '-', measuredValue: '0.82', status: 'OK' }
    ],
    activityLog: [
      { id: 'al-31', time: 'Oct 23, 04:15 PM', action: 'Inspection Started', user: 'Mike Johnson', details: 'Initiated visual inspection', type: 'start' },
      { id: 'al-32', time: 'Oct 23, 04:45 PM', action: 'Submitted for Review', user: 'Mike Johnson', details: 'Submitted to line review', type: 'submit' }
    ]
  },
  {
    id: 'chk-4',
    modelId: 'f-1',
    modelName: 'Engine Block Casing',
    partNumber: 'PN-4829-B',
    sampleId: '#2023-001',
    submitterName: 'J. Smith',
    submitterDept: 'Assembly Line B',
    submittedDate: 'Oct 24, 2023',
    submittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    status: 'PENDING',
    priority: 'HIGH',
    progress: { pic: 'CURRENT', leader: 'PENDING', spv: 'PENDING', manager: 'PENDING' },
    measurements: [
      { paramName: 'Bore Diameter A', standardValue: '85.00', tolerance: '±0.05', unit: 'mm', measuredValue: '85.02', status: 'OK' },
      { paramName: 'Bore Diameter B', standardValue: '85.00', tolerance: '±0.05', unit: 'mm', measuredValue: '84.98', status: 'OK' },
      { paramName: 'Deck Flatness', standardValue: '0.05', tolerance: 'MAX', unit: 'mm', measuredValue: '0.08', status: 'NG' },
      { paramName: 'Surface Finish (Visual)', standardValue: 'No scratches', tolerance: '-', unit: '-', measuredValue: 'Clean', status: 'OK' }
    ],
    activityLog: [
      { id: 'al-41', time: 'Oct 24, 08:15 AM', action: 'Inspection Started', user: 'J. Smith', details: 'Verification sequence initiated', type: 'start' },
      { id: 'al-42', time: 'Oct 24, 08:45 AM', action: 'NG Flagged', user: 'System', details: 'Deck Flatness out of tolerance.', type: 'flag' },
      { id: 'al-43', time: 'Oct 24, 09:00 AM', action: 'Submitted for Review', user: 'J. Smith', details: 'Escalated to Line Supervisor.', type: 'submit' }
    ]
  }
];
