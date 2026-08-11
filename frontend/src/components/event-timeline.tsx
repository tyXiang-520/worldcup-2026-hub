import type { MatchEvent as MatchEventType } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

const EVENT_COLORS: Record<string, string> = {
  goal: "bg-emerald-50 border-emerald-200 text-emerald-800",
  yellow_card: "bg-amber-50 border-amber-200 text-amber-800",
  red_card: "bg-rose-50 border-rose-200 text-rose-800",
  substitution: "bg-slate-50 border-slate-200 text-slate-600",
  var: "bg-sky-50 border-sky-200 text-sky-800",
};

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  var: "📺",
  penalty_missed: "❌",
};

export function EventTimeline({
  events,
  homeTeamName,
  awayTeamName,
}: {
  events: MatchEventType[];
  homeTeamName: string;
  awayTeamName: string;
}) {
  if (events.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">暂无事件数据</p>;
  }

  return (
    <div className="relative pl-6">
      {/* 竖线 */}
      <div className="absolute left-[7px] top-0 h-full w-px bg-slate-200" aria-hidden />

      <ul className="space-y-0">
        {events.map((event) => (
          <li
            key={event.id}
            className="relative pb-5 last:pb-0"
          >
            {/* 节点圆点 */}
            <span
              className={`absolute -left-6 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border text-[9px] ${EVENT_COLORS[event.type] ?? "border-slate-200 bg-white"}`}
              aria-hidden
            >
              {EVENT_ICONS[event.type] ?? "•"}
            </span>

            {/* 事件卡片 */}
            <div
              className={`ml-3 rounded-xl border px-4 py-2.5 ${EVENT_COLORS[event.type] ?? "border-slate-100 bg-white"}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tabular-nums opacity-70">
                  {event.minute}&apos;
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </span>
                <span className="ml-auto text-[11px] text-slate-400">
                  {event.teamSide === "home" ? homeTeamName : awayTeamName}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-snug">
                {event.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
