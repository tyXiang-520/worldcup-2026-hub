"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScorerEntry } from "@/lib/stats-types";

const SORT_OPTIONS = [
  { value: "goals", label: "进球" },
  { value: "assists", label: "助攻" },
  { value: "appearances", label: "出场" },
];

export function TopScorers() {
  const [data, setData] = useState<ScorerEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("goals");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/stats/top-scorers?sortBy=${sortBy}&order=desc`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setData(json.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sortBy]);

  if (loading) return <div className="py-10"><Skeleton /></div>;
  if (error) return <div className="py-16 text-center text-sm text-slate-500">加载失败：{error}</div>;
  if (!data || data.length === 0) return <div className="py-16 text-center text-sm text-slate-400">暂无进球数据</div>;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 pr-2">#</th>
              <th className="px-2 py-3">球员</th>
              <th className="px-2 py-3">球队</th>
              <th className="px-2 py-3 text-center">进球</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((s, i) => (
              <tr key={s.playerId} className="transition hover:bg-slate-50">
                <td className="py-3 pl-4 pr-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                    i < 3 ? "bg-amber-100 text-amber-800" : "text-slate-400"
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <Link href={`/players/${s.playerId}`} className="text-[14px] font-semibold text-slate-800 transition hover:text-blue-600">
                    {s.name}
                  </Link>
                </td>
                <td className="px-2 py-3 text-[13px] text-slate-500">
                  <Link href={`/teams/${s.teamId}`} className="transition hover:text-blue-600">
                    {s.teamName}
                  </Link>
                </td>
                <td className="px-2 py-3 text-center text-[14px] font-bold tabular-nums text-slate-900">{s.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5">
          <div className="h-6 w-6 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <div className="ml-auto h-4 w-8 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
