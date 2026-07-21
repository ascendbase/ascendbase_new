import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, PrimaryButton } from "@/components/ui";

export default function LearnPostNotFound() {
  return (
    <>
      <SiteNav />
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-black tracking-tight">Article not found</h1>
        <p className="mt-3 text-white/55">
          This read may have been moved or is members-only. Browse the free vault instead.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/learn">
            <PrimaryButton className="px-6 py-2.5">Browse free reads</PrimaryButton>
          </Link>
          <Link href="/ratios" className="btn-red rounded-full px-6 py-2.5 text-sm font-semibold">
            Try the calculator →
          </Link>
        </div>
      </Container>
    </>
  );
}
