
'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import type { LandmarkId, LandmarksState, PlacedLandmark, Landmark, ImageDimensions, VisualizationHint, Point } from '../../lib/types';
import { RATIO_DEFINITIONS } from '../../lib/ratios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

  interface LandmarkEditorProps {
    imageSrc: string | null;
    activeLandmarkDefs: Landmark[]; 
    landmarkValues: LandmarksState; 
    onLandmarkValuesChange: (landmarks: LandmarksState) => void;
    currentGlobalScale: number;
    imageOffset: { x: number; y: number };
    onImageOffsetChange: (offset: { x: number; y: number }) => void;
    rotationAngle: number;
    visualizationHint: VisualizationHint | null; 
    onImageLoad?: (dimensions: ImageDimensions) => void; 
    isDrawingMode: boolean;
    isPanMode: boolean;
  }

export interface LandmarkEditorRef {
  clearDrawings: () => void;
  getCanvasAsDataURL: () => string | null;
}

export const LandmarkEditor = forwardRef<LandmarkEditorRef, LandmarkEditorProps>(({
  imageSrc,
  activeLandmarkDefs,
  landmarkValues,
  onLandmarkValuesChange,
  currentGlobalScale,
  imageOffset,
  onImageOffsetChange,
  rotationAngle,
  visualizationHint,
  onImageLoad,
  isDrawingMode,
  isPanMode,
  }, ref) => {
    const [selectedLandmarkId, setSelectedLandmarkId] = useState<LandmarkId | null>(null);
    const [draggingLandmarkId, setDraggingLandmarkId] = useState<LandmarkId | null>(null);
    const [imageSize, setImageSize] = useState<ImageDimensions>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null); 
  const imageViewportRef = useRef<HTMLDivElement>(null); 
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastDrawPointRef = useRef<Point | null>(null);


  const { toast } = useToast();

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const isPanningStateRef = useRef(isPanning);
  useEffect(() => { isPanningStateRef.current = isPanning; }, [isPanning]);
  
  const currentGlobalScaleRef = useRef(currentGlobalScale);
  useEffect(() => { currentGlobalScaleRef.current = currentGlobalScale; }, [currentGlobalScale]);

  const imageOffsetRef = useRef(imageOffset);
useEffect(() => { 
  imageOffsetRef.current = imageOffset; 
  // Redraw canvas on pan to keep it aligned
  // This can be performance intensive, might need optimization if laggy.
  // For now, it ensures drawings stay in place visually.
}, [imageOffset]);


  const rotationAngleRef = useRef(rotationAngle);
  useEffect(() => { rotationAngleRef.current = rotationAngle; }, [rotationAngle]);

  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    clearDrawings: () => {
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    },
    getCanvasAsDataURL: () => {
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        return canvas.toDataURL('image/png');
      }
      return null;
    }
  }));


  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const newSize = { width: img.naturalWidth, height: img.naturalHeight };
          setImageSize(newSize);
          if (onImageLoad) onImageLoad(newSize);
        } else {
          toast({
            title: "Image Load Error",
            description: "Could not get valid dimensions from the uploaded image. It might be empty or corrupted. Please try another image.",
            variant: "destructive",
          });
          setImageSize(null);
          if (onImageLoad) onImageLoad(null);
        }
      };
      img.onerror = () => {
        toast({
          title: "Image Load Error",
          description: "The selected image could not be loaded. It might be corrupted or an unsupported format.",
          variant: "destructive",
        });
        setImageSize(null);
        if (onImageLoad) onImageLoad(null);
      };
      img.src = imageSrc;
    } else {
      setImageSize(null);
      if (onImageLoad) onImageLoad(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, toast]); 

  const getNaturalCoordinates = useCallback((
    event: MouseEvent | React.MouseEvent<HTMLDivElement>,
    viewportElement: HTMLDivElement | null,
    currentScale: number,
    currentImgOffset: { x: number; y: number },
    currentImgSize: { width: number; height: number } | null,
    currentRotation: number
  ): { x: number; y: number } | null => {
    if (!viewportElement || !currentImgSize || currentScale === 0) return null;

    const viewportRect = viewportElement.getBoundingClientRect();

    const clickXInViewport = event.clientX - viewportRect.left;
    const clickYInViewport = event.clientY - viewportRect.top;

    // Undo pan and zoom to get coordinates in the un-rotated container's space
    const xInContainer = (clickXInViewport - currentImgOffset.x) / currentScale;
    const yInContainer = (clickYInViewport - currentImgOffset.y) / currentScale;

    // Now, undo the rotation which happened around the center of the image
    const cx = currentImgSize.width / 2;
    const cy = currentImgSize.height / 2;

    // Translate point to be relative to the rotation center
    const translatedX = xInContainer - cx;
    const translatedY = yInContainer - cy;

    // Apply the inverse rotation
    const rad = -currentRotation * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    // Translate point back and clamp to image boundaries
    let naturalX = Math.max(0, Math.min(rotatedX + cx, currentImgSize.width));
    let naturalY = Math.max(0, Math.min(rotatedY + cy, currentImgSize.height));

    if (isNaN(naturalX) || !isFinite(naturalX) || isNaN(naturalY) || !isFinite(naturalY)) {
        console.error("Calculated NaN/non-finite for natural coordinates from viewport method.");
        toast({title: "Coordinate Error", description: "Could not accurately determine position.", variant: "destructive"});
        return null;
    }
    return { x: naturalX, y: naturalY };
  }, [toast]);


  const updateLandmarkPosition = useCallback((id: LandmarkId, x: number, y: number) => {
    if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) {
        console.error(`Attempted to update landmark ${id} with invalid coordinates: X=${x}, Y=${y}`);
        toast({ title: "Invalid Position", description: `Coordinates for ${activeLandmarkDefs.find(l=>l.id===id)?.name || id} are invalid.`, variant: "destructive" });
        return;
    }
    const updatedLandmarks = {
      ...landmarkValues,
      [id]: { ...(landmarkValues[id] || activeLandmarkDefs.find(d => d.id === id)), x, y, isPlaced: true },
    };
    onLandmarkValuesChange(updatedLandmarks);
  }, [landmarkValues, onLandmarkValuesChange, toast, activeLandmarkDefs]);

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingMode || isPanningStateRef.current || draggingLandmarkId) return; 
    if (!selectedLandmarkId) return;

    const coords = getNaturalCoordinates(event, imageViewportRef.current, currentGlobalScaleRef.current, imageOffsetRef.current, imageSize, rotationAngleRef.current);
    if (coords) {
      updateLandmarkPosition(selectedLandmarkId, coords.x, coords.y);
    }
  };
  
  const handleLandmarkMouseDown = (id: LandmarkId, event: React.MouseEvent) => {
    if (isDrawingMode) return;
    event.stopPropagation(); 
    setDraggingLandmarkId(id);
    setSelectedLandmarkId(id); 
  };

  const handleLandmarkMouseMove = useCallback((event: MouseEvent) => {
    if (isDrawingMode || !draggingLandmarkId) return;
    
    const coords = getNaturalCoordinates(event, imageViewportRef.current, currentGlobalScaleRef.current, imageOffsetRef.current, imageSize, rotationAngleRef.current);
    if (coords && draggingLandmarkId) {
        onLandmarkValuesChange({
        ...landmarkValues,
        [draggingLandmarkId]: { ...(landmarkValues[draggingLandmarkId] || activeLandmarkDefs.find(d => d.id === draggingLandmarkId)), x: coords.x, y: coords.y, isPlaced: true },
        });
    }
  }, [isDrawingMode, draggingLandmarkId, onLandmarkValuesChange, getNaturalCoordinates, activeLandmarkDefs, imageSize]); 

  const handleLandmarkMouseUp = useCallback(() => {
    setDraggingLandmarkId(null);
  }, []);


  useEffect(() => {
    if (draggingLandmarkId) {
      document.addEventListener('mousemove', handleLandmarkMouseMove);
      document.addEventListener('mouseup', handleLandmarkMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleLandmarkMouseMove);
      document.removeEventListener('mouseup', handleLandmarkMouseUp);
    };
  }, [draggingLandmarkId, handleLandmarkMouseMove, handleLandmarkMouseUp]);

  const handlePanOrDrawMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return; 
    const targetIsLandmark = (event.target as HTMLElement)?.closest && (event.target as HTMLElement).closest('g[data-landmark-id]');

    if (isDrawingMode) {
      if (targetIsLandmark) return;
      event.preventDefault();
      setIsDrawing(true);
      const coords = getNaturalCoordinates(event, imageViewportRef.current, currentGlobalScale, imageOffset, imageSize, rotationAngle);
      lastDrawPointRef.current = coords;
    } else { // Pan mode
      if (targetIsLandmark || draggingLandmarkId) {
          if (!isPanMode && selectedLandmarkId) return;
          if (isPanMode && targetIsLandmark) return;
          if (!isPanMode && !selectedLandmarkId) return;
      }
      event.preventDefault();
      isPanningStateRef.current = true; 
      setIsPanning(true); 
      panStartRef.current = { x: event.clientX, y: event.clientY };
      initialOffsetRef.current = { ...imageOffsetRef.current }; 
    }
  };

  const drawLine = (start: Point, end: Point, ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = '#ff0000'; // red
    ctx.lineWidth = 2 / currentGlobalScale;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  useEffect(() => {
    const ownerDocument = imageViewportRef.current?.ownerDocument ?? document;

    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDrawingMode) {
        if (!isDrawing) return;
        const coords = getNaturalCoordinates(event, imageViewportRef.current, currentGlobalScaleRef.current, imageOffsetRef.current, imageSize, rotationAngleRef.current);
        if (coords && lastDrawPointRef.current) {
          const ctx = drawingCanvasRef.current?.getContext('2d');
          if (ctx) {
            drawLine(lastDrawPointRef.current, coords, ctx);
          }
        }
        lastDrawPointRef.current = coords;
      } else { // Pan mode
        if (!isPanningStateRef.current || !panStartRef.current ) return;
        const dx = event.clientX - panStartRef.current.x;
        const dy = event.clientY - panStartRef.current.y;
        onImageOffsetChange({
          x: initialOffsetRef.current.x + dx,
          y: initialOffsetRef.current.y + dy,
        });
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (isDrawingMode) {
        setIsDrawing(false);
        lastDrawPointRef.current = null;
      } else {
        if (isPanningStateRef.current) { 
          isPanningStateRef.current = false; 
          setIsPanning(false); 
          panStartRef.current = null;
        }
      }
    };
    
    ownerDocument.addEventListener('mousemove', handleGlobalMouseMove);
    ownerDocument.addEventListener('mouseup', handleGlobalMouseUp);
    ownerDocument.addEventListener('mouseleave', handleGlobalMouseUp);

    return () => {
      ownerDocument.removeEventListener('mousemove', handleGlobalMouseMove);
      ownerDocument.removeEventListener('mouseup', handleGlobalMouseUp);
      ownerDocument.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDrawing, isDrawingMode, isPanning, onImageOffsetChange, getNaturalCoordinates, imageSize]);


  const activeVisualizeLandmarkIds = useMemo(() => {
    const ids = new Set<LandmarkId>();
    if (!visualizationHint) return ids;

    if (visualizationHint.type === 'line' || visualizationHint.type === 'angle') {
      visualizationHint.points.forEach(id => ids.add(id));
    } else if (visualizationHint.type === 'lines') {
      visualizationHint.segments.forEach(segment => {
        ids.add(segment[0]);
        ids.add(segment[1]);
      });
    }
    return ids;
  }, [visualizationHint]);

  if (!imageSrc || !imageSize || imageSize.width === 0 || imageSize.height === 0) {
    return (
      <Card className="md:col-span-2 shadow-md">
        <CardHeader><CardTitle>Landmark Editor</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Upload an image to begin placing landmarks.</p></CardContent>
      </Card>
    );
  }

  const baseCrossArmLength = 8; 
  const baseStrokeWidth = 1.5; 
  const baseTextFontSize = 12; 

  const scaledCrossArmLength = Math.max(2, baseCrossArmLength / currentGlobalScale);
  const scaledStrokeWidth = Math.max(0.5, baseStrokeWidth / currentGlobalScale);
  const scaledTextFontSize = Math.max(6, baseTextFontSize / currentGlobalScale); 
  const scaledTextOffset = scaledCrossArmLength * 1.2; 

  const dynamicCursor = isDrawingMode
    ? 'crosshair'
    : isPanMode
      ? (isPanning ? 'grabbing' : 'grab')
      : (isPanning ? 'grabbing' : (selectedLandmarkId ? 'crosshair' : 'grab'));

  const handleLandmarkButtonClick = (id: LandmarkId) => {
    setSelectedLandmarkId(prevId => prevId === id ? null : id);
  };
  
                const visualizationHighlightColor = "#e8434f";
                const visualizationDimmedColor = "rgba(215,0,21,0.35)";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      <Card className="md:col-span-1 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-headline">Select & Place Landmarks</CardTitle>
        </CardHeader>
        <CardContent>
          {activeLandmarkDefs.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">
              Select ratios from the "Select Ratios for Analysis" section below to see the required landmarks.
            </p>
          )}
          {activeLandmarkDefs.length > 0 && (
            <ScrollArea className="h-[400px] pr-3"> 
              <ul className="space-y-1">
                {activeLandmarkDefs.map((def) => {
                  const landmark = landmarkValues[def.id];
                  const isVisualized = visualizationHint && activeVisualizeLandmarkIds.has(def.id);

                  return (
                    <li key={def.id}>
                      <button
                        type="button"
                        onClick={() => handleLandmarkButtonClick(def.id)}
                        disabled={isDrawingMode}
                        className={`w-full flex items-center text-left h-auto py-2 px-3 text-sm rounded-lg border transition-colors cursor-pointer ${
                          selectedLandmarkId === def.id
                            ? 'bg-primary/20 border-primary text-white'
                            : isVisualized
                              ? 'border-accent text-accent hover:bg-accent/10'
                              : 'border-white/10 text-white/80 hover:bg-white/5'
                        } ${isDrawingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {landmark?.isPlaced ? (
                          <CheckCircle2 className={`h-4 w-4 mr-2 flex-shrink-0 ${isVisualized ? 'text-accent' : 'text-green-500'}`} />
                        ) : (
                          <HelpCircle className={`h-4 w-4 mr-2 flex-shrink-0 ${isVisualized ? 'text-accent': 'text-white/40'}`} />
                        )}
                        <span className="flex-grow">{def.name}</span>
                      </button>
                      {selectedLandmarkId === def.id && (
                        <div className="mt-1 p-2 text-xs bg-white/5 border border-white/10 rounded-md text-white/70">
                          <p className="font-semibold text-white/90">{def.description}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div
        ref={imageViewportRef}
        className="md:col-span-2 relative w-full bg-muted/30 rounded-lg overflow-hidden shadow-md"
        style={{ 
            aspectRatio: (imageSize.width && imageSize.height) ? `${imageSize.width / imageSize.height}` : '1 / 1',
            cursor: dynamicCursor,
         }}
         onMouseDown={handlePanOrDrawMouseDown} 
         onClick={handleImageClick} 
      >
        <div
          ref={imageContainerRef} 
          style={{
            width: `${imageSize.width}px`, 
            height: `${imageSize.height}px`,
            transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentGlobalScale})`,
            transformOrigin: 'top left', 
            willChange: 'transform', 
          }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            transform: `rotate(${rotationAngle}deg)`,
            transformOrigin: 'center center',
            position: 'relative'
          }}>
            <Image
              src={imageSrc}
              alt="Facial image for landmark editing"
              width={imageSize.width} 
              height={imageSize.height} 
              className="block pointer-events-none absolute top-0 left-0" 
              style={{width: `${imageSize.width}px`, height: `${imageSize.height}px`}}
              draggable={false}
              priority 
            />
            <canvas
                ref={drawingCanvasRef}
                width={imageSize.width}
                height={imageSize.height}
                className="absolute top-0 left-0 pointer-events-none"
            />
            <svg
              id="landmark-svg-for-download" // ID for download function
              className="absolute top-0 left-0 pointer-events-none" 
              width={imageSize.width} 
              height={imageSize.height}
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} 
              style={{ overflow: 'visible' }} 
            >
              {visualizationHint && (
                <g>
                  {(() => {
                    const hint = visualizationHint;
                    const getLm = (id: LandmarkId): PlacedLandmark | null => {
                      const lm = landmarkValues[id];
                      return (lm && lm.isPlaced && lm.x !== null && lm.y !== null) ? lm as PlacedLandmark : null;
                    }

                    if (hint.type === 'line') {
                      const p1 = getLm(hint.points[0]);
                      const p2 = getLm(hint.points[1]);
                      if (p1 && p2) {
                        return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={visualizationHighlightColor} strokeWidth={scaledStrokeWidth * 1.2} strokeDasharray="4 2" />;
                      }
                    } else if (hint.type === 'angle') {
                      const p1 = getLm(hint.points[0]);
                      const p2 = getLm(hint.points[1]); 
                      const p3 = getLm(hint.points[2]);
                      if (p1 && p2 && p3) {
                        return (
                          <>
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={visualizationHighlightColor} strokeWidth={scaledStrokeWidth * 1.2} strokeDasharray="4 2" />
                            <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke={visualizationHighlightColor} strokeWidth={scaledStrokeWidth * 1.2} strokeDasharray="4 2" />
                            <circle cx={p2.x} cy={p2.y} r={scaledCrossArmLength / 2} fill="none" stroke={visualizationHighlightColor} strokeWidth={scaledStrokeWidth} />
                          </>
                        );
                      }
                    } else if (hint.type === 'lines') {
                      return hint.segments.map((segment, index) => {
                        const p1 = getLm(segment[0]);
                        const p2 = getLm(segment[1]);
                        if (p1 && p2) {
                          return <line key={`vis-line-${index}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={visualizationHighlightColor} strokeWidth={scaledStrokeWidth * 1.2} strokeDasharray="4 2" />;
                        }
                        return null;
                      });
                    }
                    return null;
                  })()}
                </g>
              )}

              {Object.values(landmarkValues).filter((lm): lm is PlacedLandmark => !!lm && lm.isPlaced).map((lm) => {
                if (lm.x === null || lm.y === null || isNaN(lm.x) || !isFinite(lm.x) || isNaN(lm.y) || !isFinite(lm.y)) return null;
                
                const isCurrentSelectedForPlacement = selectedLandmarkId === lm.id;
                const isCurrentDragging = draggingLandmarkId === lm.id;
                const isPartOfVisualizedRatio = visualizationHint && activeVisualizeLandmarkIds.has(lm.id);

                let landmarkColor = visualizationDimmedColor; 
                if (isCurrentSelectedForPlacement || isCurrentDragging) {
                  landmarkColor = '#ffffff'; 
                } else if (isPartOfVisualizedRatio) {
                  landmarkColor = visualizationHighlightColor; 
                }
                
                const displayX = lm.x;
                const displayY = lm.y;
                const currentCrossArmLength = isPartOfVisualizedRatio && !isCurrentSelectedForPlacement ? scaledCrossArmLength * 1.2 : scaledCrossArmLength;
                const currentStrokeWidth = isPartOfVisualizedRatio && !isCurrentSelectedForPlacement ? scaledStrokeWidth * 1.2 : scaledStrokeWidth;


                return (
                  <g 
                    key={lm.id}
                    data-landmark-id={lm.id} 
                    transform={`translate(${displayX}, ${displayY})`} 
                    onMouseDown={(e: React.MouseEvent) => { 
                      e.stopPropagation(); 
                      handleLandmarkMouseDown(lm.id, e);
                    }}
                    className={isCurrentDragging ? 'cursor-grabbing' : 'cursor-grab'}
                    style={{ pointerEvents: 'auto' }} 
                  >
                    <line 
                      x1={-currentCrossArmLength / 2} y1={0} 
                      x2={currentCrossArmLength / 2} y2={0} 
                      stroke={landmarkColor}
                      strokeWidth={currentStrokeWidth}
                    />
                    <line 
                      x1={0} y1={-currentCrossArmLength / 2} 
                      x2={0} y2={currentCrossArmLength / 2} 
                      stroke={landmarkColor}
                      strokeWidth={currentStrokeWidth}
                    />
                    {(isCurrentSelectedForPlacement || (isPartOfVisualizedRatio && currentGlobalScale > 0.5) ) && (
                      <text 
                        x={scaledTextOffset} 
                        y={scaledTextFontSize / 3} 
                        fontSize={scaledTextFontSize}
                        fill={isPartOfVisualizedRatio ? visualizationHighlightColor : "#f5f5f7"}
                        paintOrder="stroke" 
                        stroke="#0a0a0c" 
                        strokeWidth={currentStrokeWidth / 2} 
                        strokeLinecap="butt" 
                        strokeLinejoin="miter"
                        style={{ pointerEvents: 'none' }} 
                      >
                        {lm.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

LandmarkEditor.displayName = 'LandmarkEditor';
