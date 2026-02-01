import { PatientCase, TimePoint } from './types';

// Mock Patient Data simulating progression of fibrosis over 2 years
export const MOCK_PATIENT: PatientCase = {
  id: 'PT-8942',
  name: 'Eleanor Vance',
  age: 64,
  condition: 'Idiopathic Pulmonary Fibrosis (Suspected)',
  similarCases: ['PT-1022', 'PT-5591'],
  timeline: [
    {
      id: 'tp-0',
      date: '2023-02-14',
      label: 'Baseline',
      scanImage: 'https://picsum.photos/400/400?grayscale&blur=2',
      analysisStatus: 'completed',
      metrics: {
        totalVolume: 4200,
        expansionRatio: 0.85,
        stiffnessIndex: 2.1,
        airTrapping: 5,
        lobeVolumes: {
          rul: 850,
          rml: 450,
          rll: 900,
          lul: 950,
          lll: 1050
        }
      }
    },
    {
      id: 'tp-1',
      date: '2024-03-01',
      label: 'Year 1',
      scanImage: 'https://picsum.photos/401/401?grayscale&blur=2',
      analysisStatus: 'completed',
      metrics: {
        totalVolume: 3950,
        expansionRatio: 0.72,
        stiffnessIndex: 4.5,
        airTrapping: 12,
        lobeVolumes: {
          rul: 820,
          rml: 410,
          rll: 800, // Significant loss in lower lobes
          lul: 920,
          lll: 900
        }
      }
    },
    {
      id: 'tp-2',
      date: '2025-03-10',
      label: 'Year 2 (Current)',
      scanImage: 'https://picsum.photos/402/402?grayscale&blur=2',
      analysisStatus: 'completed',
      metrics: {
        totalVolume: 3650,
        expansionRatio: 0.58,
        stiffnessIndex: 6.8,
        airTrapping: 18,
        lobeVolumes: {
          rul: 790,
          rml: 380,
          rll: 650, // Accelerated loss
          lul: 880,
          lll: 750 // Accelerated loss
        }
      }
    }
  ]
};

export const LOBE_COLORS = {
  rul: '#3b82f6', // blue-500
  rml: '#06b6d4', // cyan-500
  rll: '#6366f1', // indigo-500
  lul: '#3b82f6',
  lll: '#6366f1'
};

export const LUNG_PATH_RIGHT = "M50,30 C80,20 110,40 120,80 C125,120 120,220 100,280 C80,320 30,300 20,250 C10,200 15,100 20,80 C25,50 40,35 50,30 Z";
export const LUNG_PATH_LEFT = "M180,30 C210,25 240,45 230,90 C225,140 230,220 210,280 C190,320 140,300 130,250 C120,200 125,100 130,80 C135,50 160,35 180,30 Z";
