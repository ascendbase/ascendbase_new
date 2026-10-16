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

export function ResultsHandoff({
  tierName,
}: {
  tierName: string;
}) {
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
    <Card className="glass-card shadow-md border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
          <Sparkles className="h-5 w-5 text-primary" />
          {state === 'visitor' ? 'What actually moves this number?' : 'Want to know what to DO about this score?'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-white/65">
          {state === 'visitor' ? (
            <>
              Your <span className="font-semibold text-white">{tierName}</span>{' '}
              score is computed — but a number alone doesn't change your face.
              The ascendbase vault explains the craniofacial mechanics behind
              every ratio you just measured, and what genuinely improves them.
            </>
          ) : (
            <>
              The vault explains your ratios. A{" "}
              <span className="font-semibold text-white">
                personal evaluation
              </span>{" "}
              tells you exactly what to do about them: your individual flaw
              list, face morphs showing your potential, and a fix plan built
              around your actual measurements.
            </>
          )}
        </p>
        <Link
          href={state === 'visitor' ? '/signup' : '/checkout'}
          className="ratios-btn-red inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {state === 'visitor'
            ? 'Create a free account — see what drives your score'
            : 'Get your personal facial evaluation →'}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-center text-xs text-white/35">
          {state === 'visitor'
            ? 'Free forever · the calculator stays free either way'
            : 'Direct line to the founder · full breakdown in ~48h'}
        </p>
      </CardContent>
    </Card>
  );
}
