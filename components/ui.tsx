import React from "react";

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`glass rounded-3xl p-6 sm:p-8 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  tone = "red",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "red" | "green";
}) {
  const base =
    tone === "green" ? "btn-green" : "btn-red";
  return (
    <button
      className={`${base} inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold tracking-tight disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`field ${className}`}
      style={{ minHeight: 120, resize: "vertical" }}
      {...props}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-white/60">
      {children}
    </label>
  );
}

export function Badge({
  children,
  tone = "red",
}: {
  children: React.ReactNode;
  tone?: "red" | "white" | "green";
}) {
  const tones: Record<string, string> = {
    red: "bg-red/15 text-red-glow border-red/30",
    white: "bg-white/10 text-white/80 border-white/20",
    green: "bg-green/15 text-green-glow border-green/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}