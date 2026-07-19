
import type { Landmark, LandmarkId, LandmarksState } from './types';

export const LANDMARK_DEFINITIONS_RAW: Omit<Landmark, 'x' | 'y' | 'isPlaced'>[] = [
  // --- Alignment Landmarks (Frontal & Profile Views) ---
  { id: 'orbitaleLeft', name: 'Left Eye Socket (lowest point)', description: 'The lowest point of your left eye socket, just under the eye.' },
  { id: 'orbitaleRight', name: 'Right Eye Socket (lowest point)', description: 'The lowest point of your right eye socket, just under the eye.' },
  { id: 'tragusLeft', name: 'Left Ear Opening (top)', description: 'The small bump in front of your left ear canal.' },
  { id: 'tragusRight', name: 'Right Ear Opening (top)', description: 'The small bump in front of your right ear canal.' },

  // --- Midline Vertical Landmarks (Frontal & Profile) ---
  { id: 'trichion', name: 'Hairline Center', description: 'The middle point of your hairline on the forehead.' },
  { id: 'glabella', name: 'Forehead Center (between brows)', description: 'The most forward point of your forehead, between the eyebrows. Use a side-profile photo.' },
  { id: 'nasion', name: 'Top of Nose Bridge', description: 'The dip at the top of your nose, between the eyes.' },
  { id: 'subnasale', name: 'Base of Nose (where it meets lip)', description: 'Where the bottom of your nose meets the top of your upper lip.' },
  { id: 'upperLipSuperior', name: 'Top Edge of Upper Lip', description: 'The middle of the top border of your upper lip.' },
  { id: 'stomion', name: 'Lips Meeting Line', description: 'The middle of the line where your upper and lower lips meet.' },
  { id: 'lowerLipInferior', name: 'Bottom Edge of Lower Lip', description: 'The middle of the bottom border of your lower lip.' },
  { id: 'menton', name: 'Bottom of Chin', description: 'The lowest point of your chin in the middle.' },

  // --- Eye Landmarks (Frontal View) ---
  { id: 'pupilLeft', name: 'Left Pupil Center', description: 'The center of your left pupil.' },
  { id: 'medialCanthusLeft', name: 'Left Eye Inner Corner', description: 'The inner corner of your left eye (near the nose).' },
  { id: 'lateralCanthusLeft', name: 'Left Eye Outer Corner', description: 'The outer corner of your left eye.' },
  { id: 'upperEyelidMidpupilLeft', name: 'Left Upper Eyelid (above pupil)', description: 'A point on your left upper eyelid, straight above the pupil.' },
  { id: 'lowerEyelidMidpupilLeft', name: 'Left Lower Eyelid (below pupil)', description: 'A point on your left lower eyelid, straight below the pupil.' },

  { id: 'pupilRight', name: 'Right Pupil Center', description: 'The center of your right pupil.' },
  { id: 'medialCanthusRight', name: 'Right Eye Inner Corner', description: 'The inner corner of your right eye (near the nose).' },
  { id: 'lateralCanthusRight', name: 'Right Eye Outer Corner', description: 'The outer corner of your right eye.' },
  { id: 'upperEyelidMidpupilRight', name: 'Right Upper Eyelid (above pupil)', description: 'A point on your right upper eyelid, straight above the pupil.' },
  { id: 'lowerEyelidMidpupilRight', name: 'Right Lower Eyelid (below pupil)', description: 'A point on your right lower eyelid, straight below the pupil.' },

  // --- Nose Width Landmarks (Frontal View) ---
  { id: 'alaLeft', name: 'Left Nostril Edge', description: 'The outermost point of your left nostril wing.' },
  { id: 'alaRight', name: 'Right Nostril Edge', description: 'The outermost point of your right nostril wing.' },

  // --- Mouth Width Landmarks (Frontal View) ---
  { id: 'mouthCornerLeft', name: 'Left Mouth Corner', description: 'The left corner of your mouth.' },
  { id: 'mouthCornerRight', name: 'Right Mouth Corner', description: 'The right corner of your mouth.' },

  // --- Face Width & Jaw Landmarks (Frontal & Profile) ---
  { id: 'zygionLeft', name: 'Left Cheekbone (widest point)', description: 'The widest point of your left cheekbone.' },
  { id: 'zygionRight', name: 'Right Cheekbone (widest point)', description: 'The widest point of your right cheekbone.' },
  { id: 'gonionLeft', name: 'Left Jaw Angle', description: 'The back-bottom corner of your left jaw.' },
  { id: 'gonionRight', name: 'Right Jaw Angle', description: 'The back-bottom corner of your right jaw.' },
  { id: 'condyle', name: 'Jaw Joint (near ear)', description: 'The point where your jaw meets the skull, just in front of the ear. Use a side-profile photo.' },

  // --- NEW Jaw Frontal Angle Landmarks ---
  { id: 'jawMasseterLeft', name: 'Left Jaw (below cheek)', description: 'A point on your left jawline, below the cheek muscle — the start of the jaw angle.' },
  { id: 'chinSideLeft', name: 'Left Chin Side', description: 'The outermost point of your chin on the left side — the end of the jaw angle.' },
  { id: 'jawMasseterRight', name: 'Right Jaw (below cheek)', description: 'A point on your right jawline, below the cheek muscle — the start of the jaw angle.' },
  { id: 'chinSideRight', name: 'Right Chin Side', description: 'The outermost point of your chin on the right side — the end of the jaw angle.' },

  // --- Nose Analysis Landmarks (Profile) ---
  { id: 'pronasale', name: 'Nose Tip', description: 'The most forward-pointing tip of your nose.' },
  { id: 'rhinion', name: 'Nose Bridge (midpoint)', description: 'The middle of the bridge of your nose.' },
  { id: 'posteriorNostril', name: 'Back of Nostril', description: 'The rearmost point of your nostril opening (side view).' },
  { id: 'anteriorNostril', name: 'Front of Nostril', description: 'The highest front point of your nostril rim (side view).' },
  { id: 'septumAxis', name: 'Nose Base Center', description: 'A point along the center of your nose base (columella) to show its tilt.' },
];

export const LANDMARK_DEFINITIONS: Landmark[] = LANDMARK_DEFINITIONS_RAW.map(def => ({
  ...def,
  x: null,
  y: null,
  isPlaced: false,
}));


export const INITIAL_LANDMARKS_STATE: LandmarksState = LANDMARK_DEFINITIONS.reduce((acc, landmark) => {
  acc[landmark.id] = { ...landmark }; 
  return acc;
}, {} as LandmarksState);


export const FRONTAL_ALIGNMENT_LANDMARK_IDS: LandmarkId[] = ['orbitaleLeft', 'orbitaleRight', 'tragusLeft', 'tragusRight'];
export const PROFILE_ALIGNMENT_LANDMARK_IDS: LandmarkId[] = ['orbitaleRight', 'tragusRight']; // Also used for Nose analysis

export const NOSE_ANALYSIS_LANDMARK_IDS: LandmarkId[] = ['nasion', 'rhinion', 'pronasale', 'posteriorNostril', 'anteriorNostril', 'subnasale', 'septumAxis'];

export const FRONTAL_ALIGNMENT_LANDMARK_DEFS: Landmark[] = LANDMARK_DEFINITIONS.filter(def =>
  FRONTAL_ALIGNMENT_LANDMARK_IDS.includes(def.id)
);
export const PROFILE_ALIGNMENT_LANDMARK_DEFS: Landmark[] = LANDMARK_DEFINITIONS.filter(def =>
  PROFILE_ALIGNMENT_LANDMARK_IDS.includes(def.id)
);

export const NOSE_ANALYSIS_LANDMARK_DEFS: Landmark[] = LANDMARK_DEFINITIONS.filter(def => 
  NOSE_ANALYSIS_LANDMARK_IDS.includes(def.id)
);

// This is the set of landmarks used for alignment checks only. These will be excluded from the main landmark list during ratio analysis.
const alignmentOnlyLandmarkIds = new Set([
  ...FRONTAL_ALIGNMENT_LANDMARK_IDS, 
  ...PROFILE_ALIGNMENT_LANDMARK_IDS,
]);

// This is the master list of all landmarks available for any analysis (frontal ratios, profile ratios, nose analysis).
// It excludes landmarks that are *only* used for the initial head alignment step.
export const FACIAL_ANALYSIS_LANDMARK_DEFS: Landmark[] = LANDMARK_DEFINITIONS.filter(def =>
  !alignmentOnlyLandmarkIds.has(def.id)
);

export const getInitialStateForLandmarkDefs = (defs: Landmark[]): LandmarksState => {
  return defs.reduce((acc, landmark) => {
    acc[landmark.id] = { ...landmark, x: null, y: null, isPlaced: false };
    return acc;
  }, {} as LandmarksState);
};
