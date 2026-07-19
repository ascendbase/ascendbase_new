
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion"
import { HelpCircle } from "lucide-react";

export function ScoreExplanation() {
  return (
    <div>
        <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" />
            How to Read Your Score
        </h3>
        <Accordion type="single" collapsible className="w-full text-sm">
            <AccordionItem value="item-1">
                <AccordionTrigger>What do the Tiers and Ratings mean?</AccordionTrigger>
                <AccordionContent className="space-y-2">
                    <p>The Harmony Score is grouped into tiers (from "LTN" to "Chad") with a 0-5 rating to make it easier to interpret.</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li><strong>5/5 (Chad Tier):</strong> Exceptional harmony, very close to the ideal aesthetic model.</li>
                        <li><strong>4/5 (Chadlite Tier):</strong> Strong harmony, aligning very well with ideal ratios.</li>
                        <li><strong>3/5 (HTN Tier):</strong> A very good and desirable score, indicating well-proportioned features.</li>
                        <li><strong>2/5 (MTN Tier):</strong> A solid, average score with some minor deviations.</li>
                        <li><strong>1/5 (LTN Tier):</strong> A mix of harmonious features and more noticeable deviations.</li>
                    </ul>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>What does "Low," "Mid," or "High" mean?</AccordionTrigger>
                <AccordionContent>
                   The "Low," "Mid," or "High" qualifier tells you where your score sits within its current tier. For example, a "High HTN" score means you are at the upper end of the HTN (3/5) range and are close to reaching the next tier up.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}

    