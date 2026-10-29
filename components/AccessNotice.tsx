import type { ReactNode } from "react";

/** The card both access screens are built from, so they read as one app. */
export default function AccessNotice({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-cream p-6">
      <div className="max-w-md rounded-2xl border border-hairline bg-paper p-8">
        <p className="eyebrow">Lantern Maps</p>
        <h1 className="mt-1 font-display text-[26px] leading-none font-normal text-ink">
          Content manager
        </h1>
        {children}
      </div>
    </main>
  );
}
