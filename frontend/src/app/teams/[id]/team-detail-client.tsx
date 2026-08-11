"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { TeamDetailData } from "@/lib/types";
import { fetchTeamDetail } from "@/lib/api";

export function TeamDetailClient({ teamId: _, data: initialData }: { teamId: number; data: TeamDetailData | null }) {
  const params = useParams();
  const teamId = Number(params.id);
  const [data, setData] = useState<TeamDetailData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && initialData.team.id === teamId) return;
    let cancelled = false; setLoading(true);
    fetchTeamDetail(teamId).then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12"><div className="h-64 animate-pulse rounded-3xl bg-slate-100" /></div>;
  if (error || !data) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><span className="text-5xl">⚠️</span><h2 className="mt-4 text-xl font-bold text-slate-800">{error || "球队不存在"}</h2><Link href="/matches" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white">返回赛程</Link></div>;

  const { team, players, matches } = data;
  const stats = team.stats;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/matches" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800">← 返回赛程</Link>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-xl sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-5xl shadow-inner ring-1 ring-white/20">
            {team.flagUrl ? <img src={team.flagUrl} alt={team.name} className="h-full w-full object-cover" /> : "🏳️"}
          </div>
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

      {stats && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">本届赛事数据</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            <StatCard label="场次" value={stats.matches} /><StatCard label="胜" value={stats.wins} /><StatCard label="平" value={stats.draws} /><StatCard label="负" value={stats.losses} />
            <StatCard label="进球" value={stats.goalsFor} /><StatCard label="失球" value={stats.goalsAgainst} />
            <StatCard label="净胜球" value={stats.goalDifference > 0 ? `+${stats.goalDifference}` : `${stats.goalDifference}`} />
          </div>
        </section>
      )}

      {players && players.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-5 text-lg font-bold text-slate-800">球队球员 ({players.length}人)</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p: any) => (
              <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{p.number || '?'}</span>
                <span className="text-[14px] font-medium text-slate-800">{p.name}</span>
                <span className="ml-auto text-[12px] text-slate-400">{p.position}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {matches && matches.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-5 text-lg font-bold text-slate-800">本届比赛 ({matches.length}场)</h2>
          <div className="space-y-2">
            {matches.map((m: any) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
                <span className="text-[13px] font-medium text-slate-800">{m.homeTeam.name} {m.homeScore} - {m.awayScore} {m.awayTeam.name}</span>
                <span className="text-[12px] text-slate-400">{m.date}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function StatCard({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-[12px] text-slate-500">{label}</p></div>; }
