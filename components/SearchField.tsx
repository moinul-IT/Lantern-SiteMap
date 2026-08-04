"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search; Escape clears it while focused.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <label className="group flex h-11 w-full items-center gap-2.5 rounded-xl border border-hairline bg-paper px-3.5 shadow-float transition-shadow duration-200 focus-within:shadow-lift">
      <span
        aria-hidden="true"
        className="size-3.5 shrink-0 rounded-full border-[1.5px] border-ink-faint transition-colors duration-200 group-focus-within:border-ink-soft"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            event.currentTarget.blur();
          }
        }}
        placeholder="Search sites or addresses"
        aria-label="Search sites or addresses"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      <kbd className="hidden shrink-0 font-mono text-[10px] tracking-wider text-ink-faint sm:block">
        ⌘K
      </kbd>
    </label>
  );
}
