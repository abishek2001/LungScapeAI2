
export enum ViewMode {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT'
}

export enum ScanType {
  CT = 'CT',
  MRI = 'MRI'
}

export interface VisualizationLayers {
  leftLung: boolean;      // Visibility of Left Lung Mesh
  rightLung: boolean;     // Visibility of Right Lung Mesh
  lobes: boolean;         // Color-coded lobes
  bronchi: boolean;       // Large airways
  bronchioles: boolean;   // Small airways
  alveoli: boolean;       // Surface texture detail
  vasculature: boolean;   // Veins/Arteries
  pleura: boolean;        // Outer membrane
  airflow: boolean;       // Particle flow animation
  fibrosisMap: boolean;   // Heatmap overlay
  motion: boolean;        // Breathing expansion
}

export interface LungMetrics {
  totalVolume: number; // in mL
  expansionRatio: number; // 0.0 to 1.0 (during inspiration)
  stiffnessIndex: number; // 0.0 to 10.0
  airTrapping: number; // %
  lobeVolumes: {
    rul: number; // Right Upper Lobe
    rml: number; // Right Middle Lobe
    rll: number; // Right Lower Lobe
    lul: number; // Left Upper Lobe
    lll: number; // Left Lower Lobe
  };
}

export interface TimePoint {
  id: string;
  date: string;
  label: string; // e.g., "Baseline", "Year 1", "Year 2"
  metrics: LungMetrics;
  scanImage: string; // Placeholder URL
  analysisStatus: 'pending' | 'processing' | 'completed';
}

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  condition: string; // e.g., "IPF", "COPD"
  timeline: TimePoint[];
  similarCases: string[]; // IDs of similar cases
}

export interface AnalysisResponse {
  summary: string;
  trends: string;
  recommendations: string; // Non-medical advice, mostly "continue monitoring"
}
