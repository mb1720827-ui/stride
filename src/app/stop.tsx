"use client";

import Link from "next/link";
import { useOptimistic } from "react";
import { setItemStatus } from "./actions";
import { Icon } from "./icons";
import { Marker, NowChip, primaryButton, quietButton, secondaryButton, stopSize, type StopState } from "./ui";

type Line = "solid" | "dashed" | "none";
const lineClass = { solid: "line-past", dashed: "line-ahead", none: "" };

function Rail({ above, below, children }: { above: Line; below: Line; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {/* Above a stop the line is solid only behind you; ahead, the dashes stop short of the marker. */}
      <span className={`h-2 w-1 ${above === "solid" ? "line-past" : ""}`} />
      {children}
      <span className={`w-1 flex-1 ${lineClass[below]}`} />
    </div>
  );
}

const grid = "grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)]";

export interface StopItem {
  id: string;
  title: string;
  time: string;
  minutes: number;
  status: StopState;
  meta: string;
  href: string;
}

/** One stop on today's route. Done and Skip update the marker instantly, then save. */
export function Stop({ item, isNext, above, below }: { item: StopItem; isNext: boolean; above: Line; below: Line }) {
  const [status, setStatus] = useOptimistic(item.status);
  async function act(formData: FormData) {
    setStatus(formData.get("status") as StopState);
    await setItemStatus(formData);
  }
  const next = isNext && status === "planned";
  const faded = status === "done" || status === "skipped";

  return (
    <li className={grid}>
      <div className={`tnum pt-1.5 pr-1 text-right text-[15px] font-extrabold ${faded ? "text-muted" : ""}`}>{item.time}</div>
      <Rail above={above} below={below}>
        <Marker state={status} size={stopSize(item.minutes)} />
      </Rail>
      <div className="min-w-0 pb-5 pl-1">
        {next ? (
          <div className="rounded-2xl border-2 border-brand bg-white p-4">
            <Link href={item.href} className="block text-xl leading-tight font-extrabold tracking-[-0.01em] text-balance hover:underline">
              {item.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{item.meta}</p>
            <form action={act} className="mt-4 flex gap-2.5">
              <input type="hidden" name="id" value={item.id} />
              <button name="status" value="done" className={`${primaryButton} flex-1 py-3.5`}>
                <Icon name="check" className="size-5" />
                Done
              </button>
              <button name="status" value="skipped" className={`${secondaryButton} px-5`}>
                Skip
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 pt-1">
              <Link href={item.href} className={`block leading-snug font-semibold hover:underline ${faded ? "text-muted" : ""} ${status === "skipped" ? "line-through" : ""}`}>
                {item.title}
              </Link>
              <p className={`mt-0.5 text-[13px] ${status === "missed" ? "text-risk" : "text-muted"}`}>
                {status === "missed" ? `Missed ∙ ${item.meta}` : item.meta}
              </p>
            </div>
            <form action={act}>
              <input type="hidden" name="id" value={item.id} />
              {faded ? (
                <button name="status" value="planned" className={quietButton}>
                  Undo
                </button>
              ) : (
                <button
                  name="status"
                  value="done"
                  aria-label={`Done: ${item.title}`}
                  className="press grid size-11 place-items-center rounded-full border-2 border-brand text-brand hover:bg-track"
                >
                  <Icon name="check" className="size-5" />
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </li>
  );
}

/** "You are here": the current time on the route. */
export function NowStop({ time, above, below }: { time: string; above: Line; below: Line }) {
  return (
    <li className={grid} aria-label={`Now, ${time}`}>
      <div className="pt-1 pr-1 text-right text-[15px]">
        <NowChip>{time}</NowChip>
      </div>
      <Rail above={above} below={below}>
        <span className="relative z-10 size-6 rounded-full border-4 border-ink bg-here" />
      </Rail>
      <div className="pt-1.5 pb-5 pl-1 text-sm font-extrabold">You are here</div>
    </li>
  );
}
