import { Badge } from "./ui";

export function Resources({ resources }: { resources: { title: string; url: string; type: string; free: boolean; reason: string | null }[] }) {
  return (
    <div>
      <h3 className="mb-1 font-medium">Resources (links checked)</h3>
      <ul className="flex flex-col gap-2 text-sm">
        {resources.map((r, i) => (
          <li key={i}>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
              {r.title}
            </a>{" "}
            <Badge>{r.type}</Badge> {r.free ? <Badge tone="emerald">free</Badge> : <Badge tone="amber">paid</Badge>}
            {r.reason && <span className="block text-zinc-500">{r.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
