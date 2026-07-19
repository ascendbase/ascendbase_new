
import type { PlacedLandmark, RatioDefinition, LandmarkId, CalculatedRatioResult, VisualizationHint, Point, HarmonyTier } from './types';
import { PERFECT_RATIOS_DETAILS } from './types';
import { distance, angle, horizontalAngle, midpoint } from './maths';

type LandmarksInput = Record<LandmarkId, PlacedLandmark>;

const getPoints = (ids: LandmarkId[], landmarks: LandmarksInput): PlacedLandmark[] => {
  return ids.map(id => landmarks[id]!);
};

const allPointsExist = (points: (PlacedLandmark | undefined)[]): points is PlacedLandmark[] => {
  return points.every(p => p && p.x !== null && p.y !== null);
};

// Helper function to find the intersection of two lines defined by two points each
function findIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: x3, y: y3 } = p3;
    const { x: x4, y: y4 } = p4;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (den === 0) {
        return null; // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    
    // We only need the intersection point, not whether it's on the segment
    const ix = x1 + t * (x2 - x1);
    const iy = y1 + t * (y2 - y1);
    
    return { x: ix, y: iy };
}

export const RATIO_DEFINITIONS: RatioDefinition[] = [
  // --- Frontal View Ratios ---
  {
    id: 'fwhr', name: 'Facial Width to Midface Height Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.fwhr.min, perfectValueMax: PERFECT_RATIOS_DETAILS.fwhr.max,
    importance: PERFECT_RATIOS_DETAILS.fwhr.importance,
    requiredLandmarkIds: ['zygionLeft', 'zygionRight', 'nasion', 'upperLipSuperior'],
    calculate: (landmarks) => {
      const [zyL, zyR, na, ulS] = getPoints(['zygionLeft', 'zygionRight', 'nasion', 'upperLipSuperior'], landmarks);
      if (!allPointsExist([zyL, zyR, na, ulS])) return null;
      const width = distance(zyL, zyR);
      const midfaceHeight = distance(na, ulS);
      return midfaceHeight > 0 ? width / midfaceHeight : null;
    },
    description: "Bizygomatic width / Height from Nasion to Upper Lip Superior.",
    visualizationHint: { type: 'lines', segments: [['zygionLeft', 'zygionRight'], ['nasion', 'upperLipSuperior']] }
  },
  {
    id: 'mouthNoseWidthRatio', name: 'Mouth to Nose Width Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.mouthNoseWidthRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.mouthNoseWidthRatio.max,
    importance: PERFECT_RATIOS_DETAILS.mouthNoseWidthRatio.importance,
    requiredLandmarkIds: ['mouthCornerLeft', 'mouthCornerRight', 'alaLeft', 'alaRight'],
    calculate: (landmarks) => {
      const [mcL, mcR, alL, alR] = getPoints(['mouthCornerLeft', 'mouthCornerRight', 'alaLeft', 'alaRight'], landmarks);
      if (!allPointsExist([mcL, mcR, alL, alR])) return null;
      const mouthWidth = distance(mcL, mcR);
      const noseWidth = distance(alL, alR);
      return noseWidth > 0 ? mouthWidth / noseWidth : null;
    },
    description: "Mouth width (Cheilion-Cheilion) / Nose width (Alare-Alare).",
    visualizationHint: { type: 'lines', segments: [['mouthCornerLeft', 'mouthCornerRight'], ['alaLeft', 'alaRight']] }
  },
  {
    id: 'noseWidthRatio', name: 'Nose to Face Width Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.noseWidthRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.noseWidthRatio.max,
    importance: PERFECT_RATIOS_DETAILS.noseWidthRatio.importance,
    requiredLandmarkIds: ['alaLeft', 'alaRight', 'zygionLeft', 'zygionRight'],
    calculate: (landmarks) => {
      const [alL, alR, zyL, zyR] = getPoints(['alaLeft', 'alaRight', 'zygionLeft', 'zygionRight'], landmarks);
      if (!allPointsExist([alL, alR, zyL, zyR])) return null;
      const noseWidth = distance(alL, alR);
      const faceWidth = distance(zyL, zyR);
      return faceWidth > 0 ? noseWidth / faceWidth : null;
    },
    description: "Nose width (Alare-Alare) / Bizygomatic width.",
    visualizationHint: { type: 'lines', segments: [['alaLeft', 'alaRight'], ['zygionLeft', 'zygionRight']] }
  },
  {
    id: 'lipHeightRatio', name: 'Lower to Upper Lip Height Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.lipHeightRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.lipHeightRatio.max,
    importance: PERFECT_RATIOS_DETAILS.lipHeightRatio.importance,
    requiredLandmarkIds: ['upperLipSuperior', 'stomion', 'lowerLipInferior'],
    calculate: (landmarks) => {
      const [ulS, st, llI] = getPoints(['upperLipSuperior', 'stomion', 'lowerLipInferior'], landmarks);
      if (!allPointsExist([ulS, st, llI])) return null;
      const upperLipHeight = distance(ulS, st);
      const lowerLipHeight = distance(st, llI);
      return upperLipHeight > 0 ? lowerLipHeight / upperLipHeight : null;
    },
    description: "Lower lip vermilion height / Upper lip vermilion height.",
    visualizationHint: { type: 'lines', segments: [['upperLipSuperior', 'stomion'], ['stomion', 'lowerLipInferior']] }
  },
  {
    id: 'chinPhiltrumRatio', name: 'Chin to Philtrum Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.chinPhiltrumRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.chinPhiltrumRatio.max,
    importance: PERFECT_RATIOS_DETAILS.chinPhiltrumRatio.importance,
    requiredLandmarkIds: ['subnasale', 'upperLipSuperior', 'lowerLipInferior', 'menton'],
    calculate: (landmarks) => {
      const [sn, ulS, llI, me] = getPoints(['subnasale', 'upperLipSuperior', 'lowerLipInferior', 'menton'], landmarks);
      if (!allPointsExist([sn, ulS, llI, me])) return null;
      const philtrumHeight = distance(sn, ulS);
      const chinHeight = distance(llI, me);
      return philtrumHeight > 0 ? chinHeight / philtrumHeight : null;
    },
    description: "Chin height (Lower Lip Inferior-Menton) / Philtrum length (Subnasale-UpperLipSuperior).",
    visualizationHint: { type: 'lines', segments: [['subnasale', 'upperLipSuperior'], ['lowerLipInferior', 'menton']] }
  },
    {
    id: 'chinWidthRatio', name: 'Chin Width Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.chinWidthRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.chinWidthRatio.max,
    importance: PERFECT_RATIOS_DETAILS.chinWidthRatio.importance,
    requiredLandmarkIds: ['zygionLeft', 'zygionRight', 'chinSideLeft', 'chinSideRight'],
    calculate: (landmarks) => {
      const [zyL, zyR, csL, csR] = getPoints(['zygionLeft', 'zygionRight', 'chinSideLeft', 'chinSideRight'], landmarks);
      if (!allPointsExist([zyL, zyR, csL, csR])) return null;
      const bizygomaticWidth = distance(zyL, zyR);
      const chinWidth = distance(csL, csR);
      return chinWidth > 0 ? (bizygomaticWidth * 0.9) / chinWidth : null;
    },
    description: "(Bizygomatic width * 0.9) / Chin width.",
    visualizationHint: { type: 'lines', segments: [['zygionLeft', 'zygionRight'], ['chinSideLeft', 'chinSideRight']] }
  },
  {
    id: 'jawFrontalAngle', name: 'Jaw Frontal Angle', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.jawFrontalAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.jawFrontalAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.jawFrontalAngle.importance,
    requiredLandmarkIds: ['jawMasseterLeft', 'chinSideLeft', 'jawMasseterRight', 'chinSideRight'],
    calculate: (landmarks) => {
      const [jml, csl, jmr, csr] = getPoints(['jawMasseterLeft', 'chinSideLeft', 'jawMasseterRight', 'chinSideRight'], landmarks);
      if (!allPointsExist([jml, csl, jmr, csr])) return null;
      
      const intersectionPoint = findIntersection(jml, csl, jmr, csr);
      if (!intersectionPoint) return null; // Parallel lines, no angle

      return angle(csl, intersectionPoint, csr);
    },
    description: "Angle formed by the intersection of the two jawlines.",
    visualizationHint: { type: 'lines', segments: [['jawMasseterLeft', 'chinSideLeft'], ['jawMasseterRight', 'chinSideRight']] }
  },
  {
    id: 'bigonialBizygomaticRatio', name: 'Bigonial to Bizygomatic Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.bigonialBizygomaticRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.bigonialBizygomaticRatio.max,
    importance: PERFECT_RATIOS_DETAILS.bigonialBizygomaticRatio.importance,
    requiredLandmarkIds: ['gonionLeft', 'gonionRight', 'zygionLeft', 'zygionRight'],
    calculate: (landmarks) => {
      const [goL, goR, zyL, zyR] = getPoints(['gonionLeft', 'gonionRight', 'zygionLeft', 'zygionRight'], landmarks);
      if (!allPointsExist([goL, goR, zyL, zyR])) return null;
      const bigonialWidth = distance(goL, goR);
      const bizygomaticWidth = distance(zyL, zyR);
      return bizygomaticWidth > 0 ? bigonialWidth / bizygomaticWidth : null;
    },
    description: "Bigonial width / Bizygomatic width.",
    visualizationHint: { type: 'lines', segments: [['gonionLeft', 'gonionRight'], ['zygionLeft', 'zygionRight']] }
  },
  {
    id: 'esr', name: 'Eye Separation Ratio (ESR)', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.esr.min, perfectValueMax: PERFECT_RATIOS_DETAILS.esr.max,
    importance: PERFECT_RATIOS_DETAILS.esr.importance,
    requiredLandmarkIds: ['pupilLeft', 'pupilRight', 'zygionLeft', 'zygionRight'],
    calculate: (landmarks) => {
      const [pL, pR, zyL, zyR] = getPoints(['pupilLeft', 'pupilRight', 'zygionLeft', 'zygionRight'], landmarks);
      if (!allPointsExist([pL, pR, zyL, zyR])) return null;
      const interpupillary = distance(pL, pR);
      const bizygomaticWidth = distance(zyL, zyR);
      return bizygomaticWidth > 0 ? interpupillary / bizygomaticWidth : null;
    },
    description: "Interpupillary distance / Bizygomatic width.",
    visualizationHint: { type: 'lines', segments: [['pupilLeft', 'pupilRight'], ['zygionLeft', 'zygionRight']] }
  },
  {
    id: 'canthalTilt', name: 'Eyes Canthal Tilt', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.canthalTilt.min, perfectValueMax: PERFECT_RATIOS_DETAILS.canthalTilt.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.canthalTilt.importance,
    requiredLandmarkIds: ['medialCanthusLeft', 'lateralCanthusLeft', 'medialCanthusRight', 'lateralCanthusRight'],
    calculate: (landmarks) => {
      const [mcL, lcL, mcR, lcR] = getPoints(['medialCanthusLeft', 'lateralCanthusLeft', 'medialCanthusRight', 'lateralCanthusRight'], landmarks);
      if (!allPointsExist([mcL, lcL, mcR, lcR])) return null;
      const leftTilt = horizontalAngle(mcL, lcL);
      const rightTilt = horizontalAngle(mcR, lcR);
      return (leftTilt + rightTilt) / 2;
    },
    description: "Average angle of the line connecting medial (inner) and lateral (outer) canthi with the horizontal. Positive: lateral canthus is visually higher than medial. Calculated as geometric angle.",
    visualizationHint: { type: 'lines', segments: [['medialCanthusLeft', 'lateralCanthusLeft'], ['medialCanthusRight', 'lateralCanthusRight']] }
  },
  {
    id: 'emeAngle', name: 'Eye-Mouth-Eye (EME) Angle', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.emeAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.emeAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.emeAngle.importance,
    requiredLandmarkIds: ['pupilLeft', 'pupilRight', 'stomion'],
    calculate: (landmarks) => {
      const [pL, pR, st] = getPoints(['pupilLeft', 'pupilRight', 'stomion'], landmarks);
      if (!allPointsExist([pL, pR, st])) return null;
      return angle(pL, st, pR);
    },
    description: "Angle at Stomion (lip center), formed by Pupil Left - Stomion - Pupil Right.",
    visualizationHint: { type: 'angle', points: ['pupilLeft', 'stomion', 'pupilRight'] }
  },
  {
    id: 'eyeWidthHeightRatio', name: 'Eye Width to Height Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.eyeWidthHeightRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.eyeWidthHeightRatio.max,
    importance: PERFECT_RATIOS_DETAILS.eyeWidthHeightRatio.importance,
    requiredLandmarkIds: ['medialCanthusLeft', 'lateralCanthusLeft', 'upperEyelidMidpupilLeft', 'lowerEyelidMidpupilLeft'],
    calculate: (landmarks) => {
      const [mcL, lcL, ueL, leL] = getPoints(['medialCanthusLeft', 'lateralCanthusLeft', 'upperEyelidMidpupilLeft', 'lowerEyelidMidpupilLeft'], landmarks);
      if (!allPointsExist([mcL, lcL, ueL, leL])) return null;
      const eyeWidth = distance(mcL, lcL);
      const eyeHeight = distance(ueL, leL);
      return eyeHeight > 0 ? eyeWidth / eyeHeight : null;
    },
    description: "Palpebral fissure width (medial to lateral canthus) / Palpebral fissure height (upper to lower eyelid at pupil). (Left eye shown)",
    visualizationHint: { type: 'lines', segments: [['medialCanthusLeft', 'lateralCanthusLeft'], ['upperEyelidMidpupilLeft', 'lowerEyelidMidpupilLeft']] }
  },
  {
    id: 'midToLowerFaceHeightRatio', name: 'Midface to Lower Face Height Ratio', view: 'frontal',
    perfectValueMin: PERFECT_RATIOS_DETAILS.midToLowerFaceHeightRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.midToLowerFaceHeightRatio.max,
    importance: PERFECT_RATIOS_DETAILS.midToLowerFaceHeightRatio.importance,
    requiredLandmarkIds: ['nasion', 'subnasale', 'menton'],
    calculate: (landmarks) => {
      const [na, sn, me] = getPoints(['nasion', 'subnasale', 'menton'], landmarks);
      if (!allPointsExist([na, sn, me])) return null;
      const midFaceHeight = distance(na, sn);
      const lowerFaceHeight = distance(sn, me);
      return lowerFaceHeight > 0 ? midFaceHeight / lowerFaceHeight : null;
    },
    description: "Ratio of Midface height (Nasion-Subnasale) to Lower face height (Subnasale-Menton).",
    visualizationHint: { type: 'lines', segments: [['nasion', 'subnasale'], ['subnasale', 'menton']] }
  },
  // --- Profile View Ratios ---
  {
    id: 'gonialAngle', name: 'Gonial Angle', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.gonialAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.gonialAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.gonialAngle.importance,
    requiredLandmarkIds: ['condyle', 'gonionRight', 'menton'],
    calculate: (landmarks) => {
      const [co, go, me] = getPoints(['condyle', 'gonionRight', 'menton'], landmarks);
      if (!allPointsExist([co, go, me])) return null;
      return angle(co, go, me);
    },
    description: "Jaw angle from a side profile view. Uses right-side landmarks.",
    visualizationHint: { type: 'angle', points: ['condyle', 'gonionRight', 'menton'] }
  },
  {
    id: 'mandibularPlaneAngle', name: 'Mandibular Plane Angle', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.mandibularPlaneAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.mandibularPlaneAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.mandibularPlaneAngle.importance,
    requiredLandmarkIds: ['gonionRight', 'menton'],
    calculate: (landmarks) => {
        const [go, me] = getPoints(['gonionRight', 'menton'], landmarks);
        if (!allPointsExist([go, me])) return null;
        return Math.abs(horizontalAngle(me, go));
    },
    description: "Angle of the lower jaw relative to horizontal. Uses right-side landmarks.",
    visualizationHint: { type: 'line', points: ['gonionRight', 'menton'] }
  },
  {
    id: 'mandibularRecessionAngle', name: 'Mandibular Recession Angle', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.mandibularRecessionAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.mandibularRecessionAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.mandibularRecessionAngle.importance,
    requiredLandmarkIds: ['nasion', 'menton'],
    calculate: (landmarks) => {
        const [na, me] = getPoints(['nasion', 'menton'], landmarks);
        if (!allPointsExist([na, me])) return null;
        return Math.atan2(me.x - na.x, me.y - na.y) * (180 / Math.PI);
    },
    description: "Angle of chin relative to a vertical line from nasion.",
    visualizationHint: { type: 'line', points: ['nasion', 'menton'] }
  },
  {
    id: 'facialConvexityAngle', name: 'Facial Convexity Angle', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.facialConvexityAngle.min, perfectValueMax: PERFECT_RATIOS_DETAILS.facialConvexityAngle.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.facialConvexityAngle.importance,
    requiredLandmarkIds: ['nasion', 'subnasale', 'menton'],
    calculate: (landmarks) => {
        const [na, sn, me] = getPoints(['nasion', 'subnasale', 'menton'], landmarks);
        if (!allPointsExist([na, sn, me])) return null;
        return angle(na, sn, me);
    },
    description: "Angle of facial profile (Nasion-Subnasale-Menton). Ideal is around 170°.",
    visualizationHint: { type: 'angle', points: ['nasion', 'subnasale', 'menton'] }
  },
  {
    id: 'foreheadInclination', name: 'Forehead Inclination', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.foreheadInclination.min, perfectValueMax: PERFECT_RATIOS_DETAILS.foreheadInclination.max, unit: '°',
    importance: PERFECT_RATIOS_DETAILS.foreheadInclination.importance,
    requiredLandmarkIds: ['glabella', 'trichion'],
    calculate: (landmarks) => {
        const [gl, tr] = getPoints(['glabella', 'trichion'], landmarks);
        if (!allPointsExist([gl, tr])) return null;
        const angleFromHorizontal = horizontalAngle(gl, tr);
        // We want the angle from the vertical axis.
        return 90 - angleFromHorizontal;
    },
    description: "Angle of the forehead (Glabella to Trichion) relative to a true vertical line.",
    visualizationHint: { type: 'line', points: ['glabella', 'trichion'] }
  },
  {
    id: 'ramusMandibleRatio', name: 'Ramus to Mandible Length Ratio', view: 'profile',
    perfectValueMin: PERFECT_RATIOS_DETAILS.ramusMandibleRatio.min, perfectValueMax: PERFECT_RATIOS_DETAILS.ramusMandibleRatio.max,
    importance: PERFECT_RATIOS_DETAILS.ramusMandibleRatio.importance,
    requiredLandmarkIds: ['condyle', 'gonionRight', 'menton'],
    calculate: (landmarks) => {
        const [co, go, me] = getPoints(['condyle', 'gonionRight', 'menton'], landmarks);
        if (!allPointsExist([co, go, me])) return null;
        const ramusLength = distance(co, go);
        const mandibleLength = distance(go, me);
        return mandibleLength > 0 ? ramusLength / mandibleLength : null;
    },
    description: "Ratio of jaw ramus length to mandible body length. Uses right-side landmarks.",
    visualizationHint: { type: 'lines', segments: [['condyle', 'gonionRight'], ['gonionRight', 'menton']] }
  },
];

export function getDeviationScore(userValue: number, min: number, max: number): number {
  if (userValue >= min && userValue <= max) return 100;

  const range = max - min;
  if (range === 0) { 
    if (userValue === min) return 100;
    const dist = Math.abs(userValue - min);
    // Handle case where min/max are 0. Avoid division by zero.
    const denominator = Math.abs(min) > 0.001 ? Math.abs(min) : 0.1;
    return Math.max(0, 100 - (dist / denominator) * 100);
  }

  let deviation;
  if (userValue < min) {
    deviation = min - userValue;
  } else { 
    deviation = userValue - max;
  }
  
  // The score decreases based on how many "range units" the user value is away from the ideal range.
  const score = Math.max(0, 100 - (deviation / range) * 50); // Adjusted penalty
  return score;
}

export function calculateSelectedRatios(
  landmarks: Record<LandmarkId, PlacedLandmark>,
  ratioDefsToCalculate: RatioDefinition[]
): CalculatedRatioResult[] {
  const results: CalculatedRatioResult[] = [];

  for (const def of ratioDefsToCalculate) {
    const userValue = def.calculate(landmarks);
    let differencePercent: number | null = null;
    let isInPerfectRange: boolean | null = null;
    let individualScore: number | null = null;
    let actualContribution: number | null = null;
    let maxContribution: number | null = null;

    if (userValue !== null) {
      const targetMidpoint = (def.perfectValueMin + (isFinite(def.perfectValueMax) ? def.perfectValueMax : def.perfectValueMin)) / 2;
      if (targetMidpoint !== 0) {
         differencePercent = ((userValue - targetMidpoint) / targetMidpoint) * 100;
      } else if (userValue !== 0) { 
        differencePercent = Infinity; 
      } else { 
        differencePercent = 0;
      }
      isInPerfectRange = userValue >= def.perfectValueMin && userValue <= def.perfectValueMax;
      
      individualScore = getDeviationScore(userValue, def.perfectValueMin, def.perfectValueMax);
      actualContribution = individualScore * def.importance;
      maxContribution = 100 * def.importance;
    }

    results.push({
      id: def.id,
      name: def.name,
      userValue,
      perfectValueMin: def.perfectValueMin,
      perfectValueMax: def.perfectValueMax,
      unit: def.unit,
      differencePercent,
      isInPerfectRange,
      notes: (PERFECT_RATIOS_DETAILS[def.id as keyof typeof PERFECT_RATIOS_DETAILS] as { note?: string })?.note,
      importance: def.importance,
      individualScore,
      actualContribution,
      maxContribution,
    });
  }
  return results;
}

export function calculateHarmonyScore(calculatedRatios: CalculatedRatioResult[]): { harmonyScore: number; totalActual: number; totalMax: number } | null {
  const validRatios = calculatedRatios.filter(r => r.actualContribution !== null && r.maxContribution !== null);

  if (validRatios.length === 0) {
    return null;
  }

  let totalActualContribution = 0;
  let totalMaxContribution = 0;

  for (const ratio of validRatios) {
    totalActualContribution += ratio.actualContribution!;
    totalMaxContribution += ratio.maxContribution!;
  }

  if (totalMaxContribution === 0) {
    return null;
  }

  const harmonyScore = (totalActualContribution / totalMaxContribution) * 100;
  
  return {
    harmonyScore,
    totalActual: totalActualContribution,
    totalMax: totalMaxContribution
  };
}


export function getRequiredLandmarkIdsForAllRatios(ratioDefs: RatioDefinition[] = RATIO_DEFINITIONS): Set<LandmarkId> {
  const allIds = new Set<LandmarkId>();
  ratioDefs.forEach(def => {
    def.requiredLandmarkIds.forEach(id => allIds.add(id));
  });
  return allIds;
}


export function getLandmarkDefinitionsByIds(ids: LandmarkId[]): PlacedLandmark[] {
  return ids.map(id => ({
    id,
    name: id,
    description: '',
    x: 0, y: 0,
    isPlaced: true,
  }));
}

export function getHarmonyTier(score: number): HarmonyTier {
    const tiers = [
        { min: 95, max: 100, name: "Chad Tier Harmony", rating: 5, color: "text-green-500" },
        { min: 90, max: 94.9, name: "Chadlite Tier Harmony", rating: 4, color: "text-green-500" },
        { min: 80, max: 89.9, name: "HTN Tier Harmony", rating: 3, color: "text-yellow-500" },
        { min: 65, max: 79.9, name: "MTN Tier Harmony", rating: 2, color: "text-orange-500" },
        { min: 50, max: 64.9, name: "LTN Tier Harmony", rating: 1, color: "text-red-500" },
        { min: 0, max: 49.9, name: "Below Average Harmony", rating: 0, color: "text-red-600" }
    ];

    const foundTier = tiers.find(t => score >= t.min && score <= t.max) || tiers[tiers.length - 1];
    
    const range = foundTier.max - foundTier.min;
    const third = range / 3;
    
    let qualifier: 'Low' | 'Mid' | 'High' = 'Mid';
    if (score < foundTier.min + third) {
        qualifier = 'Low';
    } else if (score >= foundTier.max - third) {
        qualifier = 'High';
    }

    // Special case for perfect score
    if (score === 100) {
      return { ...foundTier, qualifier: 'Perfect' };
    }

    return { ...foundTier, qualifier };
}
