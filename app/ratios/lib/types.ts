
export interface Point {
  x: number;
  y: number;
}

export type LandmarkId =
  // Alignment Landmarks
  | 'orbitaleLeft' | 'orbitaleRight' | 'tragusLeft' | 'tragusRight'
  // Midline Vertical
  | 'trichion' | 'nasion' | 'subnasale' | 'upperLipSuperior' | 'stomion' | 'lowerLipInferior' | 'menton'
  | 'glabella'
  // Eyes - Left
  | 'pupilLeft' | 'medialCanthusLeft' | 'lateralCanthusLeft' | 'upperEyelidMidpupilLeft' | 'lowerEyelidMidpupilLeft'
  // Eyes - Right
  | 'pupilRight' | 'medialCanthusRight' | 'lateralCanthusRight' | 'upperEyelidMidpupilRight' | 'lowerEyelidMidpupilRight'
  // Nose Width
  | 'alaLeft' | 'alaRight'
  // Mouth Width
  | 'mouthCornerLeft' | 'mouthCornerRight'
  // Face Width / Jaw
  | 'zygionLeft' | 'zygionRight'
  | 'gonionLeft' | 'gonionRight'
  | 'condyle'
  // New Jaw Angle Landmarks
  | 'jawMasseterLeft' | 'chinSideLeft' | 'jawMasseterRight' | 'chinSideRight'
  // --- Nose Analysis Specific (Profile) ---
  | 'pronasale' | 'rhinion' | 'posteriorNostril' | 'anteriorNostril' | 'septumAxis';

export interface Landmark {
  id: LandmarkId;
  name: string;
  description: string;
  x: number | null;
  y: number | null;
  isPlaced: boolean;
}

export interface PlacedLandmark extends Landmark {
  x: number;
  y: number;
  isPlaced: true;
}

export type LandmarksState = Record<LandmarkId, Landmark>;

type LineVisualization = { type: 'line'; points: [LandmarkId, LandmarkId]; label?: string };
type AngleVisualization = { type: 'angle'; points: [LandmarkId, LandmarkId, LandmarkId]; label?: string }; // vertex is points[1]
type LinesVisualization = { type: 'lines'; segments: Array<[LandmarkId, LandmarkId]>; label?: string };
export type VisualizationHint = LineVisualization | AngleVisualization | LinesVisualization;

export type AnalysisView = 'frontal' | 'profile' | 'nose';

export interface RatioDefinition {
  id: string;
  name: string;
  view: AnalysisView;
  perfectValueMin: number;
  perfectValueMax: number;
  importance: number;
  unit?: string; // e.g., "°" for angles
  calculate: (landmarks: Record<LandmarkId, PlacedLandmark>) => number | null;
  requiredLandmarkIds: LandmarkId[];
  description?: string; // Optional: brief description of how it's measured
  visualizationHint?: VisualizationHint;
}

export interface CalculatedRatioResult {
  id: string;
  name: string;
  userValue: number | null;
  perfectValueMin: number;
  perfectValueMax: number;
  unit?: string;
  differencePercent: number | null;
  isInPerfectRange: boolean | null;
  notes?: string;
  importance?: number;
  individualScore: number | null;
  actualContribution: number | null;
  maxContribution: number | null;
}


export interface NoseAnalysisResult {
  totalScore: number;
  interpretation: string;
  category: string;
  details: {
    dntpAngle: string;
    X: string;
    nostrilsAxisAngle: string;
    Y1: string;
    septumInclinationAngle: string;
    Y2: string;
    Y: string;
  };
}

export interface HarmonyTier {
    name: string;
    qualifier: 'Low' | 'Mid' | 'High' | 'Perfect';
    rating: number; // 0 to 5
    color: string; // Tailwind CSS class for color
}

export const PERFECT_RATIOS_DETAILS = {
  // Frontal Ratios
  fwhr: { min: 1.95, max: 2.2, note: "Bizygomatic width / Height from midpoint of pupils to Upper Lip Superior.", importance: 1 },
  mouthNoseWidthRatio: { min: 1.5, max: 1.62, importance: 1 },
  noseWidthRatio: { min: 0.2, max: 0.3, note: "Nose width / Bizygomatic width.", importance: 1 },
  lipHeightRatio: { min: 1.25, max: 1.67, importance: 0.7 }, 
  chinPhiltrumRatio: { min: 2, max: 3, note: "Chin height (Lower Lip Inferior-Menton) / Philtrum length (Subnasale-UpperLipSuperior).", importance: 1.1 }, 
  chinWidthRatio: { min: 2.45, max: 2.7, note: "(Bizygomatic width * 0.9) / Chin width.", importance: 0.7 },
  jawFrontalAngle: { min: 85, max: 90, unit: "°", importance: 0.7 },
  bigonialBizygomaticRatio: { min: 0.8, max: 0.92, importance: 0.8 },
  esr: { min: 0.45, max: 0.47, note: "Interpupillary to Bizygomatic width.", importance: 0.9 },
  canthalTilt: { min: 0, max: 8, unit: "°", note: "Average angle of the intercanthal line with the horizontal. Positive: lateral canthus visually higher than medial. Calculated as geometric angle.", importance: 0.7 },
  emeAngle: { min: 45, max: 51, unit: "°", note: "Around 48°. Lower values considered more masculine.", importance: 1.1 },
  eyeWidthHeightRatio: { min: 3.0, max: 4.5, importance: 1.1 },
  midToLowerFaceHeightRatio: { min: 0.67, max: 0.82, note: "Ratio of Midface height (Nasion-Subnasale) to Lower face height (Subnasale-Menton).", importance: 1.2 },
  
  // Profile Ratios - Default importance of 1 if not specified
  gonialAngle: { min: 110, max: 120, unit: "°", note: "Jaw angle from a side profile view. Ideal around 115°.", importance: 1 },
  mandibularPlaneAngle: { min: 10, max: 20, unit: "°", note: "Angle of the lower jaw relative to the horizontal. Uses right-side landmarks.", importance: 1 },
  mandibularRecessionAngle: { min: -2, max: 5, unit: "°", note: "Angle of chin relative to a vertical line from the nasion. 0° is neutral, positive is recessive, negative is prominent.", importance: 1 },
  facialConvexityAngle: { min: 165, max: 175, unit: "°", note: "Angle formed by Nasion, Subnasale, and Menton. Ideal is around 170°.", importance: 1 },
  foreheadInclination: { min: 15, max: 25, unit: "°", note: "Angle of the forehead (Glabella to Trichion) from vertical. Ideal around 20°.", importance: 1 },
  ramusMandibleRatio: { min: 0.65, max: 0.75, note: "Ratio of jaw ramus length (Condyle-Gonion) to mandible body length (Gonion-Menton). Ideal around 0.7.", importance: 1 },
};

export type AppPhase = 'image-upload' | 'analysis-mode-selection' | 'alignment-check' | 'landmark-placement' | 'results-display';
export type ImageDimensions = { width: number; height: number } | null;


    
