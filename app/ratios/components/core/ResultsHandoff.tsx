'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * P1.4 conversion handoff on the calculator results screen.
 * The user just invested effort (photo + landmark placement) and received
 * their score — the highest-intent moment in the whole funnel. The CTA
 * adapts to who is looking:
 *  - visitor → free signup
 *  - free member → Personal Advice tier (the flagship product)
 *  - paid member → nothing (they already have vault access)
 */

type HandoffState = 'loading' | 'visitor' | 'free' | 'paid';

export function ResultsHandoff() {
  const [state, setState] = useState<HandoffState>('loading');
  const [planKey, setPlanKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me');
        const d = r.ok ? await r.json() : null;
        if (!d?.user) {
          setState('visitor');
        } else if (
          d.subscription?.status === 'active' &&
          d.subscription.planKey &&
          d.subscription.planKey !== 'free'
        ) {
          setPlanKey(d.subscription.planKey);
          setState('paid');
        } else {
          setState('free');
        }
      } catch {
        setState('visitor');
      }
    })();
  }, []);

  if (state === 'loading' || state === 'paid') return null;

  return (
    <>
      <Card className="glass-card shadow-md border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-primary" />
            {state === 'visitor'
              ? 'Keep in mind: this is NOT your actual rating'
              : 'Your harmony score is only 40\u201360% of the picture'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-white/65">
            {state === 'visitor' ? (
              <>
                Harmony \u2014 the balance of your facial ratios \u2014 plays roughly{" "}
                <span className="font-semibold text-white">40\u201360%</span> of total
                importance in male facial attractiveness. It doesn't measure the
                rest: bone structure, angularity, sexual dimorphism, skin and
                framing \u2014 the features that finally determine where you actually
                land. The vault breaks all of it down.
              </>
            ) : (
              <>
                This score measures harmony only. A{" "}
                <span className="font-semibold text-white">
                  manual, professional facial evaluation
                </span>{" "}
                covers everything the calculator can't: your{" "}
                <span className="font-semibold text-white">true overall rating</span>
                , your individual flaw list, face morphs showing your potential,
                and a concrete plan for what to actually improve \u2014 done personally
                by me, not generated.
              </>
            )}
          </p>
          <Link
            href={state === 'visitor' ? '/signup' : '/checkout?plan=advice'}
            className="ratios-btn-red inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {state === 'visitor'
              ? 'Create a free account \u2014 see what the other half measures'
              : 'Get your personal facial evaluation \u2192'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-center text-xs text-white/35">
            {state === 'visitor'
              ? 'Free forever \u00b7 the calculator stays free either way'
              : 'Direct line to the founder \u00b7 done manually, not by AI'}
          </p>
        </CardContent>
      </Card>

      {/* Morph offer — standalone callout */}
      <Card className="glass-card shadow-md border-white/20 mt-4">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="text-lg">P</span>
            Wanna see yourself as HTN, Chadlite, and Chad?
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Get 3 PSL-accurate morphs built from YOUR actual facial structure \u2014
            not AI-generated. Delivered within 48h.
          </p>
          <Link
            href="/checkout?plan=morphs"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            $19 \u2014 Get my 3 morphs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
