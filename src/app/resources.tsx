import { Icon } from "./icons";

type R = { stage?: number; title: string; url: string; type: string; free: boolean; reason: string | null };

/** Learning resources grouped by stage; each one opens in a new tab. */
export function Resources({ resources, stages }: { resources: R[]; stages?: string[] }) {
  const groups = stages?.length
    ? stages.map((name, i) => ({ name, items: resources.filter((r) => (r.stage ?? 0) === i) })).filter((g) => g.items.length)
    : [{ name: "", items: resources }];
  const labelled = groups.length > 1;
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.name || "all"}>
          {labelled && <h3 className="mb-1 px-1 font-extrabold">{g.name}</h3>}
          <ul className="divide-y divide-rule">
            {g.items.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="press flex items-start gap-3 rounded-lg px-1 py-3 hover:bg-ground">
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug font-semibold">{r.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {r.type} ∙ {r.free ? "free" : "paid"}
                      {r.reason && ` ∙ ${r.reason}`}
                    </span>
                  </span>
                  <Icon name="external" className="mt-0.5 size-4 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
