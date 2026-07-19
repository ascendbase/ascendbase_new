
'use client';

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import type { RatioDefinition } from '../../lib/types';

interface RatioSelectorProps {
  allRatioDefs: RatioDefinition[];
  selectedRatioIds: Set<string>;
  onSelectionChange: (newSelectedIds: Set<string>) => void;
}

export function RatioSelector({ allRatioDefs, selectedRatioIds, onSelectionChange }: RatioSelectorProps) {
  const handleSelectAll = () => {
    const allIds = new Set(allRatioDefs.map(def => def.id));
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleRatioToggle = (ratioId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedRatioIds);
    if (checked) {
      newSelectedIds.add(ratioId);
    } else {
      newSelectedIds.delete(ratioId);
    }
    onSelectionChange(newSelectedIds);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline">Select Ratios for Analysis</CardTitle>
        <CardDescription>Choose which facial ratios you want to calculate. The Harmony Score will be based on your selection.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button onClick={handleSelectAll} variant="outline" size="sm">Select All</Button>
          <Button onClick={handleDeselectAll} variant="outline" size="sm">Deselect All</Button>
        </div>
        <ScrollArea className="h-[200px] border rounded-md p-3">
          <div className="space-y-2">
            {allRatioDefs.map((def) => (
              <div key={def.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`ratio-select-${def.id}`}
                  checked={selectedRatioIds.has(def.id)}
                  onCheckedChange={(checked) => handleRatioToggle(def.id, !!checked)}
                />
                <Label htmlFor={`ratio-select-${def.id}`} className="text-sm font-normal cursor-pointer">
                  {def.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
