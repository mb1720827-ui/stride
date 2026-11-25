import type { ReactNode } from "react";
import { Marker, stopSize, type StopState } from "./ui";

export interface RouteStop {
  key: string;
  title: ReactNode;
  sub?: ReactNode;
  /** Left column: a time, "L2", a week count… */
  label?: ReactNode;
  minutes?: number;
  state?: StopState;
  /** The end of the line: a deadline or the last milestone. */
  terminus?: boolean;
  /** A heading that sits on the line between stops (a skill stage). */
  heading?: boolean;
}

/** A plan drawn as a route: steps, levels or milestones as stops down one green line. */
export function RouteList({ stops, label }: { stops: RouteStop[]; label: string }) {
  return (
    <ol aria-label={label}>
      {stops.map((s, i) => {
        const first = i === 0;
        const last = i === stops.length - 1;
        if (s.heading) {
          return (
            <li key={s.key} className="grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)]">
              <span />
              {/* A stage change is marked on the line itself, like an interchange. */}
              <span className="relative mx-auto w-1">
                <span className={`line-past absolute inset-x-0 bottom-0 ${first ? "top-3" : "top-0"}`} />
                <span className="absolute top-2.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand" />
              </span>
              <h3 className="pt-1 pb-3 pl-1 text-base font-extrabold">{s.title}</h3>
            </li>
          );
        }
        return (
          <li key={s.key} className="grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)]">
            <div className="tnum pt-1.5 pr-1 text-right text-sm font-extrabold text-muted">{s.label}</div>
            <div className="flex flex-col items-center">
              <span className={`h-2 w-1 ${first ? "" : "line-past"}`} />
              {s.terminus ? (
                <span className="relative z-10 grid size-6 place-items-center rounded-md border-4 border-brand bg-brand" />
              ) : (
                <Marker state={s.state ?? "planned"} size={s.minutes ? stopSize(s.minutes) : "size-5"} />
              )}
              <span className={`w-1 flex-1 ${last ? "" : "line-past"}`} />
            </div>
            <div className="min-w-0 pt-1 pb-5 pl-1">
              <div className={`leading-snug ${s.terminus ? "font-extrabold" : "font-semibold"}`}>{s.title}</div>
              {s.sub && <div className="mt-0.5 text-[13px] text-muted">{s.sub}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
