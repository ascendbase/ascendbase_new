import { BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-[16px] font-bold tracking-tight sm:text-[17px]">
            ascend<span className="text-red-glow">base</span>
          </span>
          <span className="text-white/40 text-[13px] hidden sm:inline">/ Ratios</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 text-white/55">
          <BarChart3 className="h-5 w-5 text-red-glow" />
          <span className="text-[13px]">Facial Analysis</span>
        </div>
      </div>
    </header>
  );
}