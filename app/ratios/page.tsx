'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './components/core/Header';
import { ImageUploader } from './components/core/ImageUploader';
import { Instructions } from './components/core/Instructions';
import { RatioSelector } from './components/core/RatioSelector';
import { LandmarkEditor, type LandmarkEditorRef } from './components/core/LandmarkEditor';
import { RatioDisplay } from './components/core/RatioDisplay';
import { ScoreExplanation } from './components/core/ScoreExplanation';
import { NoseAnalysisDisplay } from './components/core/NoseAnalysisDisplay';
import { Toaster } from './components/ui/toaster';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import {
  RATIO_DEFINITIONS,
  calculateSelectedRatios,
  calculateHarmonyScore,
  getHarmonyTier,
  getRequiredLandmarkIdsForAllRatios,
} from './lib/ratios';
import { calculateNoseAnalysis } from './lib/noseAnalysis';
import { LANDMARK_DEFINITIONS } from './lib/landmarks';
import type {
  LandmarkId,
  LandmarksState,
  Landmark,
  PlacedLandmark,
  ImageDimensions,
  VisualizationHint,
  NoseAnalysisResult,
  RatioDefinition,
} from './lib/types';

type AnalysisMode = 'frontal' | 'profile' | 'nose';
type NoseParameter = 'X' | 'Y1' | 'Y2';
type AppPhase = 'upload' | 'mode' | 'select' | 'place' | 'results';

const MODE_META: Record<AnalysisMode, { title: string; desc: string; icon: string }> = {
  frontal: {
    title: 'Frontal Face Analysis',
    desc: 'Use a straight-on photo (camera at eye level, face filling the frame).',
    icon: '👤',
  },
  profile: {
    title: 'Side Profile Analysis',
    desc: 'Use a side-profile photo (one side of the face, head level, looking straight).',
    icon: '👥',
  },
  nose: {
    title: 'Nose Shape Analysis',
    desc: 'Use a side-profile photo to evaluate nose projection and shape.',
    icon: '👃',
  },
};

const landmarkName = (id: LandmarkId): Landmark => {
  const def = LANDMARK_DEFINITIONS.find((d) => d.id === id);
  return {
    id,
    name: def?.name ?? id,
    description: def?.description ?? '',
    x: null,
    y: null,
    isPlaced: false,
  };
};

const createInitialLandmarks = (ids: LandmarkId[]): LandmarksState => {
  const state = {} as LandmarksState;
  ids.forEach((id) => {
    state[id] = landmarkName(id);
  });
  return state;
};

export default function RatiosPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode | null>(null);
  const [selectedRatioIds, setSelectedRatioIds] = useState<Set<string>>(new Set());
  const [landmarkValues, setLandmarkValues] = useState<LandmarksState>({} as LandmarksState);
  const [calculatedResults, setCalculatedResults] = useState<ReturnType<typeof calculateSelectedRatios> | null>(null);
  const [noseResult, setNoseResult] = useState<NoseAnalysisResult | null>(null);
  const [selectedRatioId, setSelectedRatioId] = useState<string | null>(null);
  const [selectedNoseParameter, setSelectedNoseParameter] = useState<NoseParameter | null>(null);
  const [globalScale, setGlobalScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [visualizationHint, setVisualizationHint] = useState<VisualizationHint | null>(null);
  const [appPhase, setAppPhase] = useState<AppPhase>('upload');
  const [authLoading, setAuthLoading] = useState(true);

  const router = useRouter();
  const landmarkEditorRef = useRef<LandmarkEditorRef>(null);

  // Require a logged-in account (free or paid) to use the tool.
  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null));
      if (!me || !me.user) {
        router.replace('/login');
        return;
      }
      setAuthLoading(false);
    })();
  }, [router]);

  const modeRatioDefs = useMemo<RatioDefinition[]>(
    () => (analysisMode ? RATIO_DEFINITIONS.filter((d) => d.view === analysisMode) : []),
    [analysisMode]
  );

  const activeLandmarkDefs = useMemo<Landmark[]>(() => {
    if (!analysisMode) return [];
    if (analysisMode === 'nose') {
      return [
        'nasion',
        'rhinion',
        'pronasale',
        'posteriorNostril',
        'anteriorNostril',
        'subnasale',
        'septumAxis',
      ].map((id) => landmarkName(id as LandmarkId));
    }
    const ids = new Set<LandmarkId>();
    modeRatioDefs.forEach((def) => def.requiredLandmarkIds.forEach((id) => ids.add(id)));
    return Array.from(ids).map((id) => landmarkName(id));
  }, [analysisMode, modeRatioDefs]);

  const handleImageUpload = useCallback((dataUrl: string) => {
    setImageSrc(dataUrl);
    setAnalysisMode(null);
    setSelectedRatioIds(new Set());
    setLandmarkValues({} as LandmarksState);
    setCalculatedResults(null);
    setNoseResult(null);
    setAppPhase('mode');
  }, []);

  const handleSelectMode = useCallback((mode: AnalysisMode) => {
    setAnalysisMode(mode);
    setCalculatedResults(null);
    setNoseResult(null);
    if (mode === 'nose') {
      const noseIds: LandmarkId[] = [
        'nasion',
        'rhinion',
        'pronasale',
        'posteriorNostril',
        'anteriorNostril',
        'subnasale',
        'septumAxis',
      ];
      setLandmarkValues(createInitialLandmarks(noseIds));
      setAppPhase('place');
      return;
    }
    const defs = RATIO_DEFINITIONS.filter((d) => d.view === mode);
    setSelectedRatioIds(new Set(defs.map((d) => d.id)));
    const ids = new Set<LandmarkId>();
    defs.forEach((def) => def.requiredLandmarkIds.forEach((id) => ids.add(id)));
    setLandmarkValues(createInitialLandmarks(Array.from(ids)));
    setAppPhase('select');
  }, []);

  const handleCalculate = useCallback(() => {
    if (analysisMode === 'nose') {
      setNoseResult(calculateNoseAnalysis(landmarkValues as Record<LandmarkId, PlacedLandmark>));
    } else {
      const results = calculateSelectedRatios(
        landmarkValues as Record<LandmarkId, PlacedLandmark>,
        modeRatioDefs
      );
      setCalculatedResults(results);
    }
    setAppPhase('results');
  }, [analysisMode, landmarkValues, modeRatioDefs]);

  const handleRatioSelectForViz = useCallback((id: string | null) => {
    setSelectedRatioId(id);
    if (id) {
      const def = RATIO_DEFINITIONS.find((r) => r.id === id);
      setVisualizationHint(def?.visualizationHint ?? null);
    } else {
      setVisualizationHint(null);
    }
  }, []);

  const allRequiredPlaced = useMemo(() => {
    if (analysisMode === 'nose') {
      const ids: LandmarkId[] = [
        'nasion',
        'rhinion',
        'pronasale',
        'posteriorNostril',
        'anteriorNostril',
        'subnasale',
        'septumAxis',
      ];
      return ids.every((id) => {
        const lm = landmarkValues[id];
        return lm && lm.isPlaced && lm.x !== null && lm.y !== null;
      });
    }
    const required = getRequiredLandmarkIdsForAllRatios(modeRatioDefs);
    return Array.from(required).every((id) => {
      const lm = landmarkValues[id];
      return lm && lm.isPlaced && lm.x !== null && lm.y !== null;
    });
  }, [analysisMode, landmarkValues, modeRatioDefs]);

  const harmonyData = useMemo(
    () => (calculatedResults ? calculateHarmonyScore(calculatedResults) : null),
    [calculatedResults]
  );
  const harmonyTier = harmonyData ? getHarmonyTier(harmonyData.harmonyScore) : null;

  const ImagePreview = (
    <div className="glass-card rounded-2xl p-3 sticky top-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc!}
        alt="Uploaded face"
        className="w-full rounded-xl object-contain max-h-[70vh]"
      />
      {analysisMode && (
        <p className="mt-2 text-center text-[13px] text-white/55">
          {MODE_META[analysisMode].title}
        </p>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="ratios-app flex min-h-screen items-center justify-center font-sans">
        <p className="text-white/55">Loading…</p>
      </div>
    );
  }

  return (
    <div className="ratios-app min-h-screen font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {appPhase === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6 fade-up">
            <Instructions />
            <ImageUploader onImageUpload={handleImageUpload} />
          </div>
        )}

        {appPhase === 'mode' && imageSrc && (
          <div className="max-w-3xl mx-auto space-y-6 fade-up">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-4 py-1.5 text-[13px]"
                onClick={() => {
                  setImageSrc(null);
                  setAnalysisMode(null);
                  setAppPhase('upload');
                }}
              >
                ← Back
              </Button>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-white">Choose your analysis</h2>
                <p className="text-white/55 mt-1">Pick the type of photo you uploaded.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.keys(MODE_META) as AnalysisMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleSelectMode(mode)}
                  className="ratios-mode-card rounded-2xl p-5 text-left flex flex-col items-start gap-2"
                >
                  <span className="text-3xl">{MODE_META[mode].icon}</span>
                  <span className="text-lg font-semibold text-white">{MODE_META[mode].title}</span>
                  <span className="text-[13px] text-white/55 leading-snug">{MODE_META[mode].desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {appPhase === 'select' && imageSrc && analysisMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start fade-up">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="ratios-btn-ghost rounded-full px-4 py-1.5 text-[13px]"
                  onClick={() => setAppPhase('mode')}
                >
                  ← Back
                </Button>
                <Button
                  className="ratios-btn-red rounded-full px-5 py-2 text-[14px] font-semibold"
                  onClick={() => setAppPhase('place')}
                >
                  Next →
                </Button>
              </div>
              <h2 className="text-xl font-bold text-white">Select ratios to analyze</h2>
              <RatioSelector
                allRatioDefs={modeRatioDefs}
                selectedRatioIds={selectedRatioIds}
                onSelectionChange={setSelectedRatioIds}
              />
            </div>
            <div className="order-first lg:order-last">{ImagePreview}</div>
          </div>
        )}

        {appPhase === 'place' && imageSrc && analysisMode && (
          <div className="space-y-4 fade-up">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-4 py-1.5 text-[13px]"
                onClick={() => setAppPhase(analysisMode === 'nose' ? 'mode' : 'select')}
              >
                ← Back
              </Button>
              <Button
                className="ratios-btn-red rounded-full px-6 py-2.5 text-[14px] font-semibold"
                onClick={handleCalculate}
                disabled={!allRequiredPlaced}
              >
                {analysisMode === 'nose' ? 'Calculate Nose Shape' : 'Calculate Ratios'}
              </Button>
            </div>
            {!allRequiredPlaced && (
              <p className="text-[13px] text-white/45">
                Place all the marked points on your photo to continue.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => setGlobalScale((s) => Math.min(s + 0.2, 5))}
              >
                +
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => setGlobalScale((s) => Math.max(s - 0.2, 0.2))}
              >
                −
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => setRotationAngle((a) => a - 5)}
              >
                Rotate L
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => setRotationAngle((a) => a + 5)}
              >
                Rotate R
              </Button>
              <Button
                variant={isDrawingMode ? 'default' : 'ghost'}
                className={
                  isDrawingMode
                    ? 'ratios-btn-red rounded-full px-3 py-1.5 text-[13px]'
                    : 'ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]'
                }
                onClick={() => {
                  setIsDrawingMode((d) => !d);
                  if (!isDrawingMode) setIsPanMode(false);
                }}
              >
                {isDrawingMode ? 'Draw: On' : 'Draw: Off'}
              </Button>
              <Button
                variant={isPanMode ? 'default' : 'ghost'}
                className={
                  isPanMode
                    ? 'ratios-btn-red rounded-full px-3 py-1.5 text-[13px]'
                    : 'ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]'
                }
                onClick={() => {
                  setIsPanMode((p) => !p);
                  if (!isPanMode) setIsDrawingMode(false);
                }}
              >
                {isPanMode ? 'Pan: On' : 'Pan: Off'}
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => landmarkEditorRef.current?.clearDrawings()}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-3 py-1.5 text-[13px]"
                onClick={() => {
                  setImageOffset({ x: 0, y: 0 });
                  setGlobalScale(1);
                  setRotationAngle(0);
                }}
              >
                Reset
              </Button>
            </div>
            <LandmarkEditor
              ref={landmarkEditorRef}
              imageSrc={imageSrc}
              activeLandmarkDefs={activeLandmarkDefs}
              landmarkValues={landmarkValues}
              onLandmarkValuesChange={setLandmarkValues}
              currentGlobalScale={globalScale}
              imageOffset={imageOffset}
              onImageOffsetChange={setImageOffset}
              rotationAngle={rotationAngle}
              visualizationHint={visualizationHint}
              isDrawingMode={isDrawingMode}
              isPanMode={isPanMode}
            />
          </div>
        )}

        {appPhase === 'results' && imageSrc && analysisMode && (
          <div className="space-y-6 fade-up">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-4 py-1.5 text-[13px]"
                onClick={() => setAppPhase('place')}
              >
                ← Adjust landmarks
              </Button>
              <Button
                variant="ghost"
                className="ratios-btn-ghost rounded-full px-4 py-1.5 text-[13px]"
                onClick={() => {
                  setImageSrc(null);
                  setAnalysisMode(null);
                  setAppPhase('upload');
                }}
              >
                Start over
              </Button>
            </div>

            {analysisMode === 'nose' ? (
              <NoseAnalysisDisplay
                result={noseResult}
                selectedParameter={selectedNoseParameter}
                onSelectParameter={setSelectedNoseParameter}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                  <RatioDisplay
                    results={calculatedResults}
                    selectedRatioId={selectedRatioId}
                    onSelectRatio={handleRatioSelectForViz}
                  />
                </div>
                <div className="space-y-6">
                  {harmonyData && harmonyTier && (
                    <Card className="glass-card shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">Harmony Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-4xl font-bold ${harmonyTier.color}`}>
                          {harmonyData.harmonyScore.toFixed(1)} / 100
                        </p>
                        <p className="text-lg mt-1 text-white/80">
                          {harmonyTier.name}{' '}
                          <span className="text-white/45">
                            ({harmonyTier.qualifier}, {harmonyTier.rating}/5)
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  <ScoreExplanation />
                </div>
              </div>
            )}

            {analysisMode !== "nose" && harmonyData && harmonyTier && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="default"
                  className="ratios-btn-red rounded-full px-4 py-1.5 text-[13px]"
                  onClick={() => {
                    const params = new URLSearchParams({
                      score: harmonyData.harmonyScore.toFixed(0),
                      tier: harmonyTier.name,
                      mode: analysisMode || "facial",
                    });
                    const ogUrl = `${window.location.origin}/api/og/result?${params.toString()}`;
                    const shareUrl = `${window.location.origin}/ratios`;
                    const text = `My ${analysisMode} facial harmony score: ${harmonyData.harmonyScore.toFixed(
                      0
                    )}/100 (${harmonyTier.name}) — test yours free on ascendbase`;
                    if (navigator.share) {
                      navigator
                        .share({ title: "ascendbase facial ratio", text, url: shareUrl })
                        .catch(() => {});
                    } else {
                      navigator.clipboard
                        ?.writeText(`${text} ${shareUrl}`)
                        .then(() => alert("Score + link copied — paste it anywhere!"))
                        .catch(() => {});
                    }
                    new Image().src = ogUrl;
                  }}
                >
                  Share my score ↗
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}