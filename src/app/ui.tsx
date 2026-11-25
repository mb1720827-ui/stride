import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Icon } from "./icons";
import { TabBar, TabBarFrame } from "./tab-bar";

export const input =
  "w-full rounded-xl border-2 border-field bg-white px-3.5 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand focus-visible:outline-none";
export const primaryButton =
  "press inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-extrabold text-white hover:bg-brand-deep disabled:opacity-60";
export const secondaryButton =
  "press inline-flex items-center justify-center gap-2 rounded-xl bg-track px-4 py-2.5 font-extrabold text-ink hover:bg-track-hover disabled:opacity-60";
export const quietButton = "press inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:bg-track hover:text-ink";
export const panel = "rounded-2xl bg-white";

export function Logo({ className = "" }: { className?: string }) {
  return <span className={`text-base font-extrabold tracking-tight ${className}`}>Stride</span>;
}

/**
 * Every signed-in screen: a green header band (what this screen is, and where you are) over the tinted ground, with
 * the tab bar at the bottom on phones and at the top on wider screens.
 */
export function Page({ title, back, guide, children }: { title: ReactNode; back?: { href: string; label: string }; guide?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="on-brand bg-brand text-white md:pt-16">
        <div className="mx-auto max-w-xl px-5 pt-[max(env(safe-area-inset-top),20px)] pb-6 md:pt-8">
          <div className="flex h-8 items-center">
            {back ? (
              <Link href={back.href} className="press -ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-on-brand hover:bg-brand-deep">
                <Icon name="back" className="size-5" />
                {back.label}
              </Link>
            ) : (
              <Logo className="text-on-brand md:hidden" />
            )}
          </div>
          <h1 className="mt-3 text-[2rem] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance">{title}</h1>
          {guide && <div className="mt-3 text-sm font-semibold text-on-brand">{guide}</div>}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-6 pb-32 md:pb-16">{children}</main>
      <Suspense fallback={<TabBarFrame path="" />}>
        <TabBar />
      </Suspense>
    </>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 id={id} className="text-lg font-extrabold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

/** A small yellow tag for the current time ("you are here"). */
export function NowChip({ children }: { children: ReactNode }) {
  return <span className="tnum rounded-md bg-here px-1.5 py-0.5 font-extrabold text-ink">{children}</span>;
}

/** Stop size follows one fixed ramp by length, so a long session reads as long before you read it. */
export function stopSize(minutes: number) {
  if (minutes <= 15) return "size-4";
  if (minutes <= 30) return "size-5";
  if (minutes <= 60) return "size-6";
  return "size-7";
}

export type StopState = "planned" | "done" | "skipped" | "missed";

// Check and cross glyphs only where they're big enough to read.
const GLYPH = new Set(["size-5", "size-6", "size-7"]);

/** A stop on the route. State is a mark: filled (done), crossed (skipped), red ring (missed), green ring (planned). */
export function Marker({ state, size }: { state: StopState; size: string }) {
  const look = {
    done: "border-brand bg-brand text-white",
    planned: "border-brand bg-white",
    skipped: "border-skip bg-ground text-skip",
    missed: "border-risk bg-white",
  }[state];
  return (
    <span className={`stop-marker relative z-10 grid shrink-0 place-items-center rounded-full border-4 ${look} ${size}`}>
      {state === "done" && GLYPH.has(size) && (
        <svg viewBox="0 0 24 24" className="stop-check size-[70%]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      )}
      {state === "skipped" && GLYPH.has(size) && (
        <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true">
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </svg>
      )}
    </span>
  );
}

/** A plan's progress as a short horizontal route: one stop per step, day or milestone. */
export function MiniRoute({ stops, label }: { stops: StopState[]; label: string }) {
  if (stops.length === 0) return null;
  return (
    <div role="img" aria-label={label} className="relative flex items-center justify-between py-1">
      <span className="absolute inset-x-1 top-1/2 h-[3px] -translate-y-1/2 bg-track" />
      {stops.map((s, i) => (
        <Marker key={i} state={s} size="size-3.5" />
      ))}
    </div>
  );
}

/** One row in a list of updates or links: icon, text, and a chevron when it leads somewhere. */
export function Row({ icon, tone = "ink", href, children, trailing }: { icon: Parameters<typeof Icon>[0]["name"]; tone?: "ink" | "risk" | "brand"; href?: string; children: ReactNode; trailing?: ReactNode }) {
  const color = { ink: "text-muted", risk: "text-risk", brand: "text-brand" }[tone];
  const body = (
    <>
      <span className={`mt-0.5 ${color}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {trailing ?? (href && <Icon name="chevron" className="mt-0.5 size-5 text-muted" />)}
    </>
  );
  const cls = "flex items-start gap-3 px-4 py-3.5";
  return href ? (
    <Link href={href} className={`press ${cls} hover:bg-ground/60`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A habit's last 7 days as a loop line: one stop per day, oldest at the top, today last, the streak in the middle. */
export function HabitLoop({ stops, days, streak }: { stops: StopState[]; days: string[]; streak: number }) {
  const c = 120;
  const r = 76;
  const at = (k: number, radius: number) => {
    const a = ((-90 + (k * 360) / stops.length) * Math.PI) / 180;
    return [c + radius * Math.cos(a), c + radius * Math.sin(a)];
  };
  const fill = { done: "var(--color-brand)", planned: "#fff", skipped: "var(--color-ground)", missed: "#fff" };
  const ring = { done: "var(--color-brand)", planned: "var(--color-brand)", skipped: "var(--color-skip)", missed: "var(--color-risk)" };
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={`Last 7 days: ${stops.join(", ")}. ${streak}-day streak.`} className="mx-auto w-full max-w-60">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-brand)" strokeWidth="4" />
      {stops.map((s, k) => {
        const [x, y] = at(k, r);
        const [lx, ly] = at(k, r + 27);
        const today = k === stops.length - 1 && s === "planned";
        return (
          <g key={k}>
            <circle cx={x} cy={y} r="10" fill={today ? "var(--color-here)" : fill[s]} stroke={today ? "var(--color-ink)" : ring[s]} strokeWidth="4" />
            {s === "done" && <path d={`M${x - 4.5} ${y + 0.5}l3 3 6-6.5`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            {s === "skipped" && <path d={`M${x - 3.5} ${y - 3.5}l7 7m0-7l-7 7`} stroke="var(--color-skip)" strokeWidth="2.5" strokeLinecap="round" />}
            <text x={lx} y={ly + 4.5} textAnchor="middle" fontSize="13" fontWeight={today ? 800 : 600} fill={today ? "var(--color-ink)" : "var(--color-muted)"}>
              {days[k]}
            </text>
          </g>
        );
      })}
      <text x={c} y={c + 8} textAnchor="middle" fontSize="46" fontWeight="800" fill="var(--color-ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {streak}
      </text>
      <text x={c} y={c + 30} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-muted)">
        day streak
      </text>
    </svg>
  );
}
