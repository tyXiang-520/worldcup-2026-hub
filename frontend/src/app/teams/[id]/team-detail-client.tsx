"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { TeamDetailData } from "@/lib/types";
import { fetchTeamDetail } from "@/lib/api";

export function TeamDetailClient({
  teamId: _unused,
  data: initialData,
}: {
  teamId: number;
  data: TeamDetailData | null;
}) {
  const params = useParams();
  const teamId = Number(params.id);
  const [data, setData] = useState<TeamDetailData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && initialData.team.id === teamId) return;
    let cancelled = false;
    setLoading(true);
    fetchTeamDetail(teamId)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800">
          {error ? "加载失败" : "球队不存在"}
        </h2>
        <Link href="/matches" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">返回赛程</Link>
      </div>
    );
  }

  const { team } = data;
  const stats = team.stats;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/matches" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800">← 返回赛程</Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-xl sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/10 text-5xl shadow-inner ring-1 ring-white/20">🏳️</div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">{team.name}</h1>
            <p className="mt-1 text-slate-300">{team.nameEn}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur">{team.group}组</span>
              {team.fifaRanking && <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] backdrop-blur">FIFA #{team.fifaRanking}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      {stats && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">本届赛事数据</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            <StatCard label="场次" value={stats.matches} />
            <StatCard label="胜" value={stats.wins} />
            <StatCard label="平" value={stats.draws} />
            <StatCard label="负" value={stats.losses} />
            <StatCard label="进球" value={stats.goalsFor} />
            <StatCard label="失球" value={stats.goalsAgainst} />
            <StatCard label="净胜球" value={stats.goalDifference > 0 ? `+${stats.goalDifference}` : `${stats.goalDifference}`} />
          </div>
        </section>
      )}

      {/* 占位 */}
      <section className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">球队球员</h2>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <span className="text-4xl">👥</span>
          <p className="mt-3 text-sm font-medium text-slate-500">完整球员数据即将上线</p>
          <p className="mt-1 text-[13px] text-slate-400">敬请期待后续版本</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">本届比赛</h2>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <span className="text-4xl">📅</span>
          <p className="mt-3 text-sm font-medium text-slate-500">比赛列表即将上线</p>
          <p className="mt-1 text-[13px] text-slate-400">敬请期待后续版本</p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{label}</p>
    </div>
  );
}
