import type { ReactNode } from "react";

// Stride's icon set: 24px grid, 2px round strokes, drawn to match the route line.
const paths: Record<string, ReactNode> = {
  today: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <circle cx="6" cy="18.5" r="2.5" />
      <path d="M6 8v8M11 5.5h9M11 12h6M11 18.5h9" />
    </>
  ),
  plans: (
    <>
      <rect x="3.5" y="4" width="17" height="6.5" rx="2" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  review: <path d="M5 20v-8M12 20V4M19 20v-11" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chevron: <path d="M9 5.5l6.5 6.5L9 18.5" />,
  back: <path d="M15 5.5L8.5 12l6.5 6.5" />,
  alert: (
    <>
      <path d="M12 3.5l9 16h-18z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="6" width="13" height="14" rx="2" />
      <path d="M8 3h10a2 2 0 0 1 2 2v12" />
    </>
  ),
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5L11 13M18 14v5.5H4.5V6H10" />,
  send: <path d="M4 12h15M13 6l6 6-6 6" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
