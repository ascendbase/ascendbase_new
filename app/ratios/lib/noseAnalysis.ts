
import type { PlacedLandmark, LandmarkId, Point, NoseAnalysisResult } from './types';
import { angle, horizontalAngle } from './maths';

type NoseLandmarksInput = Record<LandmarkId, PlacedLandmark>;

const getPoints = (ids: LandmarkId[], landmarks: NoseLandmarksInput): (PlacedLandmark | undefined)[] => {
  return ids.map(id => landmarks[id]);
};

const allPointsExist = (points: (PlacedLandmark | undefined)[]): points is PlacedLandmark[] => {
  return points.every(p => p && p.x !== null && p.y !== null);
};

export function calculateNoseAnalysis(landmarks: NoseLandmarksInput): NoseAnalysisResult | null {
    const requiredIds: LandmarkId[] = ['nasion', 'rhinion', 'pronasale', 'posteriorNostril', 'anteriorNostril', 'subnasale', 'septumAxis'];
    const points = getPoints(requiredIds, landmarks);

    if (!allPointsExist(points)) {
        return null;
    }
    const [na, rh, pr, pn, an, sn, sa] = points;

    // 1. Dorsum plane to Nose tip projection angle (DNTP) -> X
    const dntpAngle = angle(na, rh, pr);
    const X = 180 - dntpAngle;

    // 2. Nostril Axis & Septum Inclination -> Y
    const nostrilsAxisAngle = horizontalAngle(pn, an);
    const Y1 = nostrilsAxisAngle - 7;
    
    const septumInclinationAngle = horizontalAngle(sn, sa);
    const Y2 = septumInclinationAngle - 13; // Midpoint of 10-15

    const Y = (Y1 + Y2) / 2;

    // 3. Final Score
    const totalScore = X + Y;

    // 4. Interpretation
    let interpretation: string;
    let category: string;

    if (totalScore >= -40 && totalScore < -30) {
        interpretation = "The nose shape is extremely downturned, which is generally considered an unappealing feature.";
        category = "Maximum Downturned";
    } else if (totalScore >= -30 && totalScore < -20) {
        interpretation = "The nose shape is significantly downturned.";
        category = "Significantly Downturned";
    } else if (totalScore >= -20 && totalScore < -10) {
        interpretation = "The nose shape has a noticeable downturn, but is within a broadly normal range.";
        category = "Slightly Downturned";
    } else if (totalScore >= -10 && totalScore < 0) {
        interpretation = "The nose shape is very close to ideal, with only a minimal downturn tendency.";
        category = "Around Perfect";
    } else if (totalScore >= 0 && totalScore <= 10) {
        interpretation = "The nose shape aligns perfectly with the ideal aesthetic model.";
        category = "Perfect";
    } else if (totalScore > 10 && totalScore <= 15) {
        interpretation = "The nose shape is very close to ideal, with a slight upturn tendency.";
        category = "Around Perfect";
    } else if (totalScore > 15 && totalScore <= 25) {
        interpretation = "The nose shape has a noticeable upturn, but is within a broadly normal range.";
        category = "Slightly Upturned";
    } else if (totalScore > 25 && totalScore <= 35) {
        interpretation = "The nose shape is significantly upturned ('ski-slope').";
        category = "Significantly Upturned";
    } else if (totalScore > 35 && totalScore <= 45) {
        interpretation = "The nose shape is extremely upturned, which is generally considered an unappealing feature.";
        category = "Maximum Upturned";
    } else {
        interpretation = "The calculated value is outside the typical range for analysis.";
        category = "Out of Range";
    }

    return {
        totalScore,
        interpretation,
        category,
        details: {
            dntpAngle: dntpAngle.toFixed(1),
            X: X.toFixed(1),
            nostrilsAxisAngle: nostrilsAxisAngle.toFixed(1),
            Y1: Y1.toFixed(1),
            septumInclinationAngle: septumInclinationAngle.toFixed(1),
            Y2: Y2.toFixed(1),
            Y: Y.toFixed(1),
        }
    };
}
