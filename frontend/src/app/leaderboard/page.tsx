"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type LEntry = { rank: number; username: string; points: number; predictionCount: number; correctRate: number };
type MyRank = { rank: number; points: number; predictionCount: number; correctRate: number; totalUsers: number; percentile: number };

export default function LeaderboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<LEntry[] | null>(null);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .finally(() => setLoading(false));

    if (token) {
      fetch("/api/leaderboard/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((j) => setMyRank(j.data));
    }
  }, [token]);

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-12"><Skeleton /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">Leaderboard</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">排行榜</h1>
        <p className="mt-3 text-sm text-slate-500">全赛季预测积分排名 · 积分相同按正确率排序</p>
      </div>

      {/* 个人排名 */}
      {myRank && myRank.points > 0 && (
        <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-[13px] font-semibold text-blue-700">我的排名</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">#{myRank.rank}</p>
              <p className="text-[12px] text-slate-500">超过了 {myRank.percentile}% 的球迷</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-slate-900">{myRank.points} 分</p>
              <p className="text-[12px] text-slate-500">{myRank.predictionCount} 次预测 · {myRank.correctRate}% 正确</p>
            </div>
          </div>
        </div>
      )}

      {/* 榜单 */}
      {data && data.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pl-4 pr-2">#</th>
                <th className="px-2 py-3">用户</th>
                <th className="px-2 py-3 text-center">积分</th>
                <th className="px-2 py-3 text-center">预测数</th>
                <th className="px-2 py-3 text-center">正确率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((e) => (
                <tr key={e.rank} className="transition hover:bg-slate-50">
                  <td className="py-3 pl-4 pr-2">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                      e.rank <= 3 ? (e.rank === 1 ? "bg-amber-100 text-amber-800" : e.rank === 2 ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-800") : "text-slate-400"
                    }`}>
                      {e.rank}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[14px] font-semibold text-slate-800">{e.username}</td>
                  <td className="px-2 py-3 text-center text-[14px] font-bold tabular-nums text-slate-900">{e.points}</td>
                  <td className="px-2 py-3 text-center text-[13px] tabular-nums text-slate-500">{e.predictionCount}</td>
                  <td className="px-2 py-3 text-center text-[13px] tabular-nums text-slate-500">{e.correctRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <span className="text-5xl">🏆</span>
          <p className="mt-4 text-sm text-slate-400">暂无排名数据，快去预测比赛吧</p>
          <Link href="/matches" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white">查看赛程</Link>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className="grid gap-3">{[1,2,3,4,5].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div>;
}
