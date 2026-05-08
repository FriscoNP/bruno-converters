"use client";

import type { Theme } from "../types";
import ThemeToggle from "./ThemeToggle";

type HeaderProps = {
  theme: Theme;
  onThemeToggle: () => void;
};

const BrunoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <rect width="32" height="32" rx="8" fill="var(--accent)" />
    <path
      d="M9 12h5l2 8h6l2-8h5v12h-4v-6l-2 6h-6l-2-6v6H9V12z"
      fill="var(--base)"
    />
  </svg>
);

export default function Header({ theme, onThemeToggle }: HeaderProps) {
  return (
    <header className="panel flex items-center justify-between">
      <div className="flex items-center gap-3">
        <BrunoIcon />
        <div>
          <h1 className="text-lg font-semibold md:text-xl">Bruno Converters</h1>
          <p className="muted-text text-sm">
            Convert to Bruno collections
          </p>
        </div>
      </div>
      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </header>
  );
}