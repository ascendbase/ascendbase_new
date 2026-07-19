
'use client';

import type { NoseAnalysisResult } from '../../lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import { cn } from '../../lib/utils';
import { Ruler } from 'lucide-react';

type NoseParameter = 'X' | 'Y1' | 'Y2';

interface NoseAnalysisDisplayProps {
  result: NoseAnalysisResult | null;
  selectedParameter: string | null;
  onSelectParameter: (parameter: NoseParameter | null) => void;
}

const getBadgeVariant = (category: string): "default" | "destructive" | "secondary" => {
    if (category.includes("Maximum") || category.includes("Significantly")) return "destructive";
    if (category.includes("Perfect")) return "default";
    return "secondary";
}

export function NoseAnalysisDisplay({ result, selectedParameter, onSelectParameter }: NoseAnalysisDisplayProps) {
  if (!result) {
    return (
      <Card className="shadow-md w-full">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Nose Shape Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No analysis calculated. Place all required landmarks and click "Calculate Nose Shape".
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totalScore, interpretation, category, details } = result;

  const handleRowClick = (param: NoseParameter) => {
    onSelectParameter(selectedParameter === param ? null : param);
  };

  const calculationRows: { id: NoseParameter; label: string; value: string; description: string }[] = [
    { id: 'X', label: 'Dorsum to Nose Tip Angle Deviation (X)', value: `${details.X}°`, description: '(from 180° straight line)' },
    { id: 'Y1', label: 'Nostrils Axis Deviation (Y1)', value: `${details.Y1}°`, description: '(from ideal 7°)' },
    { id: 'Y2', label: 'Septum Inclination Deviation (Y2)', value: `${details.Y2}°`, description: '(from ideal 13°)' },
  ];

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="text-xl font-headline">Nose Shape Analysis Result</CardTitle>
        <CardDescription>
          This analysis provides a score for nose shape based on several angular measurements from a profile view. Click a row in the breakdown to visualize the measurement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-muted/50 text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Nose Shape Score</p>
            <p className={cn(
                "text-4xl font-bold my-1",
                getBadgeVariant(category) === 'destructive' && 'text-destructive',
                getBadgeVariant(category) === 'default' && 'text-green-600',
            )}>
                {totalScore.toFixed(2)}
            </p>
            <Badge variant={getBadgeVariant(category)} className="text-sm">{category}</Badge>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{interpretation}</p>
        </div>
        
        <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Ruler className="mr-2 h-5 w-5 text-primary" />
                Calculation Breakdown
            </h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Description</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationRows.map(row => (
                    <TableRow 
                      key={row.id}
                      onClick={() => handleRowClick(row.id)}
                      className={cn(
                        "cursor-pointer",
                        selectedParameter === row.id ? 'bg-primary/10' : 'bg-secondary/30 hover:bg-secondary/50'
                      )}
                    >
                        <TableCell className="font-semibold">{row.label}</TableCell>
                        <TableCell className="text-right font-mono">{row.value}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.description}</TableCell>
                    </TableRow>
                  ))}
                     <TableRow>
                        <TableCell className="font-bold pl-6">Value Y (Avg of Y1, Y2)</TableCell>
                        <TableCell className="text-right font-bold font-mono">{details.Y}°</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/10">
                        <TableCell className="font-extrabold text-primary">Final Score (X + Y)</TableCell>
                        <TableCell className="text-right font-extrabold font-mono text-primary">{totalScore.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

      </CardContent>
    </Card>
  );
}
