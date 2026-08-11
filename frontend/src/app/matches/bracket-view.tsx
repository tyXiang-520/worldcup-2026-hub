"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BracketData, BracketMatch } from "@/lib/stats-types";

const STAGE_TITLES: Record<string, string> = {
  "round-of-32": "1/16",
  "round-of-16": "1/8",
  "quarter-final": "1/4",
  "semi-final": "半决赛",
  "third-place": "三四名",
};

export function BracketView() {
  const [data, setData] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/bracket")
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setData(json.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <BracketSkeleton />;
  if (error) return <div className="py-16 text-center text-sm text-slate-500">加载失败：{error}</div>;
  if (!data) return <div className="py-16 text-center text-sm text-slate-400">暂无晋级图数据</div>;

  const { rounds, final: finalMatch } = data;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-[700px] items-start gap-1">
        {rounds.map((round, ri) => (
          <div key={ri} className="flex flex-1 flex-col gap-2">
            {/* 阶段标题 */}
            <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-wider text-slate-400">
              {round.title}
            </h3>

            {/* 比赛列表 */}
            <div
              className="flex flex-col gap-2"
              style={{
                paddingTop: ri === 0 ? 0 : `${Math.pow(2, ri) * 4}px`,
                paddingBottom: ri === 0 ? 0 : `${Math.pow(2, ri) * 4}px`,
              }}
            >
              {round.matches.map((match) => (
                <BracketMatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}

        {/* 决赛 */}
        {finalMatch && (
          <div className="flex flex-1 flex-col gap-2">
            <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-wider text-amber-600">
              决赛
            </h3>
            <div style={{ paddingTop: "48px", paddingBottom: "48px" }}>
              <BracketMatchCard match={finalMatch} isFinal />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  isFinal,
}: {
  match: BracketMatch;
  isFinal?: boolean;
}) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`block rounded-xl border bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md ${
        isFinal ? "border-amber-200 ring-2 ring-amber-100" : "border-slate-200"
      }`}
    >
      {/* 主队 */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px]">🏳️</span>
        <span className="flex-1 truncate text-[13px] font-semibold text-slate-800">{match.homeTeam.name}</span>
        {hasScore && (
          <span className="text-[14px] font-bold tabular-nums text-slate-900">{match.homeScore}</span>
        )}
      </div>
      {/* 点球 */}
      {match.homePenalty !== null && (
        <div className="ml-7 text-[11px] text-slate-400">
          点球({match.homePenalty} – {match.awayPenalty})
        </div>
      )}
      {/* 客队 */}
      <div className="mt-1 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px]">🏳️</span>
        <span className="flex-1 truncate text-[13px] font-semibold text-slate-800">{match.awayTeam.name}</span>
        {hasScore && (
          <span className="text-[14px] font-bold tabular-nums text-slate-900">{match.awayScore}</span>
        )}
      </div>
    </Link>
  );
}

function BracketSkeleton() {
  return (
    <div className="flex min-w-[800px] gap-2">
      {[1, 2, 3, 4].map((c) => (
        <div key={c} className="flex flex-1 flex-col gap-2">
          <div className="mx-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
          {[1, 2].map((r) => (
            <div key={r} className="h-16 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      ))}
    </div>
  );
}
