"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StandingGroup } from "@/lib/stats-types";

export function StandingsView() {
  const [data, setData] = useState<StandingGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/standings")
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setData(json.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <StandingsSkeleton />;
  if (error) return <div className="py-16 text-center text-sm text-slate-500">加载失败：{error}</div>;
  if (!data || data.length === 0) return <div className="py-16 text-center text-sm text-slate-400">暂无积分数据</div>;

  return (
    <div className="space-y-8">
      {data.map((group) => (
        <section key={group.group} aria-labelledby={`group-${group.group}`}>
          <h3
            id={`group-${group.group}`}
            className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
              {group.group}
            </span>
            {group.group}组
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pl-4 pr-1 w-10">#</th>
                  <th className="px-1 py-3">球队</th>
                  <th className="px-1 py-3 text-center">赛</th>
                  <th className="px-1 py-3 text-center">胜</th>
                  <th className="px-1 py-3 text-center">平</th>
                  <th className="px-1 py-3 text-center">负</th>
                  <th className="px-1 py-3 text-center">球</th>
                  <th className="px-1 py-3 text-center">净胜</th>
                  <th className="px-1 py-3 text-center">分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {group.teams.map((t) => (
                  <tr
                    key={t.teamId}
                    className={`transition hover:bg-slate-50 ${
                      t.rank <= 2 ? "bg-emerald-50/50" : ""
                    }`}
                  >
                    <td className="py-3 pl-4 pr-1">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        t.rank <= 2 ? "bg-emerald-100 text-emerald-800" : "text-slate-400"
                      }`}>
                        {t.rank}
                      </span>
                    </td>
                    <td className="px-1 py-3">
                      <Link
                        href={`/teams/${t.teamId}`}
                        className="text-[14px] font-semibold text-slate-800 transition hover:text-blue-600"
                      >
                        {t.teamName}
                      </Link>
                    </td>
                    <td className="px-1 py-3 text-center text-[13px] tabular-nums text-slate-500">{t.played}</td>
                    <td className="px-1 py-3 text-center text-[13px] tabular-nums text-slate-700">{t.won}</td>
                    <td className="px-1 py-3 text-center text-[13px] tabular-nums text-slate-500">{t.drawn}</td>
                    <td className="px-1 py-3 text-center text-[13px] tabular-nums text-slate-500">{t.lost}</td>
                    <td className="px-1 py-3 text-center text-[13px] tabular-nums text-slate-500">{t.goalsFor}:{t.goalsAgainst}</td>
                    <td className={`px-1 py-3 text-center text-[13px] font-semibold tabular-nums ${t.goalDifference >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {t.goalDifference > 0 ? "+" : ""}{t.goalDifference}
                    </td>
                    <td className="px-1 py-3 text-center text-[14px] font-bold tabular-nums text-slate-900">{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function StandingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((g) => (
        <div key={g} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 h-5 w-12 animate-pulse rounded bg-slate-100" />
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className="flex items-center gap-4 border-b border-slate-50 py-3">
              <div className="h-4 w-6 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
              <div className="ml-auto h-4 w-8 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
