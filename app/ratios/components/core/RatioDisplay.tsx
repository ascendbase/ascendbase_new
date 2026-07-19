
import * as React from 'react';
import type { CalculatedRatioResult } from '../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, AlertTriangle, Star } from 'lucide-react';
import { Progress } from '../ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

interface RatioDisplayProps {
  results: CalculatedRatioResult[] | null;
  selectedRatioId: string | null;
  onSelectRatio: (id: string | null) => void;
}

export function RatioDisplay({ results, selectedRatioId, onSelectRatio }: RatioDisplayProps) {
  if (!results || results.length === 0) {
    return (
      <Card className="shadow-md w-full">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Facial Ratio Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No ratios calculated for the current selection. Select ratios, place landmarks, and click "Calculate Ratios".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Facial Ratio Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Ratio Name</TableHead>
                <TableHead className="text-right">Your Value</TableHead>
                <TableHead className="text-right">Ideal Range</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
                <TableHead className="text-right w-[150px]">Deviation & Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((ratio) => {
                const displayValue = ratio.userValue !== null ? `${ratio.userValue.toFixed(2)}${ratio.unit || ''}` : 'N/A';
                const idealMax = isFinite(ratio.perfectValueMax) ? ratio.perfectValueMax.toFixed(2) : '∞';
                const idealRange = `${ratio.perfectValueMin.toFixed(2)}${ratio.unit || ''} - ${idealMax}${ratio.unit || ''}`;
                
                const isSelected = selectedRatioId === ratio.id;

                return (
                  <React.Fragment key={ratio.id}>
                    <TableRow 
                      onClick={() => onSelectRatio(isSelected ? null : ratio.id)}
                      className={cn(
                        "cursor-pointer",
                        isSelected ? 'bg-primary/10' : (ratio.isInPerfectRange === false ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50')
                      )}
                    >
                      <TableCell className="font-medium">
                        {ratio.name}
                        {ratio.notes && <p className="text-xs text-muted-foreground mt-1">{ratio.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{displayValue}</TableCell>
                      <TableCell className="text-right font-mono">{idealRange}</TableCell>
                      <TableCell className="text-center">
                        {ratio.isInPerfectRange === true && (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                            <CheckCircle className="mr-1 h-4 w-4" /> Ideal
                          </Badge>
                        )}
                        {ratio.isInPerfectRange === false && (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-4 w-4" /> Off
                          </Badge>
                        )}
                        {ratio.isInPerfectRange === null && (
                          <Badge variant="secondary">
                            <AlertTriangle className="mr-1 h-4 w-4" /> N/A
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ratio.userValue !== null && ratio.differencePercent !== null && ratio.individualScore !== null && (
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-mono ${ratio.differencePercent > 5 ? 'text-destructive' : ratio.differencePercent < -5 ? 'text-blue-500' : 'text-foreground'}`}>
                              {ratio.differencePercent > 0 ? '+' : ''}{ratio.differencePercent.toFixed(1)}%
                              {ratio.differencePercent > 0.1 && <TrendingUp className="inline ml-1 h-4 w-4" />}
                              {ratio.differencePercent < -0.1 && <TrendingDown className="inline ml-1 h-4 w-4" />}
                            </span>
                            <Progress value={ratio.individualScore} className="h-1.5 mt-1 w-24" 
                              indicatorClassName={
                                ratio.individualScore > 80 ? 'bg-green-500' : ratio.individualScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }
                            />
                            <span className="text-xs text-muted-foreground mt-1">Score: {ratio.individualScore.toFixed(1)}/100</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {isSelected && (ratio.actualContribution !== null && ratio.maxContribution !== null) && (
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={5} className="p-3">
                                <div className="flex items-center justify-center text-sm gap-4 p-2 rounded-md bg-background border">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="font-semibold">Harmony Contribution:</span>
                                    <span className="font-mono">{ratio.actualContribution.toFixed(1)} / {ratio.maxContribution.toFixed(1)} points</span>
                                    <span className="text-muted-foreground text-xs">(Importance Multiplier: {ratio.importance})</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
