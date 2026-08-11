"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PlayerDetail } from "@/lib/types";
import { fetchPlayerDetail } from "@/lib/api";

export function PlayerDetailClient({
  playerId: _unused,
  data: initialData,
}: {
  playerId: number;
  data: PlayerDetail | null;
}) {
  const params = useParams();
  const playerId = Number(params.id);
  const [data, setData] = useState<PlayerDetail | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && initialData.id === playerId) return;
    let cancelled = false;
    setLoading(true);
    fetchPlayerDetail(playerId)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800">
          {error ? "加载失败" : "球员不存在"}
        </h2>
        <Link href="/matches" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">返回赛程</Link>
      </div>
    );
  }

  const stats = data.tournamentStats;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/matches" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800">← 返回赛程</Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-8 text-white shadow-xl sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white/10 text-5xl font-bold shadow-inner ring-1 ring-white/20">
            {data.number > 0 ? data.number : "?"}
          </div>
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h1 className="text-2xl font-bold sm:text-3xl">{data.name}</h1>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur">#{data.number}</span>
            </div>
            {data.nameEn && <p className="mt-1 text-slate-300">{data.nameEn}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] backdrop-blur">{data.position}</span>
              {data.nationality && <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] backdrop-blur">{data.nationality}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* 基本信息 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">基本信息</h2>
          <ul className="divide-y divide-slate-100">
            <InfoRow label="位置" value={data.position} />
            {data.nationality && <InfoRow label="国籍" value={data.nationality} />}
            {data.age && <InfoRow label="年龄" value={`${data.age} 岁`} />}
            {data.height && <InfoRow label="身高" value={`${data.height} cm`} />}
            {data.weight && <InfoRow label="体重" value={`${data.weight} kg`} />}
            {data.marketValue && <InfoRow label="身价" value={data.marketValue} />}
            {data.club && <InfoRow label="俱乐部" value={data.club} />}
          </ul>
          {!data.age && !data.club && (
            <p className="py-6 text-center text-[13px] text-slate-400">基本信息待补充</p>
          )}
        </section>

        {/* 赛事数据 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">本届赛事数据</h2>
          {stats ? (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="出场" value={stats.appearances} />
              <StatCard label="进球" value={stats.goals} />
              <StatCard label="助攻" value={stats.assists} />
              <StatCard label="黄牌" value={stats.yellowCards} />
              <StatCard label="红牌" value={stats.redCards} />
              <StatCard label="出场分钟" value={stats.minutesPlayed} />
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-slate-400">暂无赛事数据</p>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between py-3">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800">{value}</span>
    </li>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{label}</p>
    </div>
  );
}
