"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Prediction = {
  id: number;
  matchId: number;
  prediction: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  points: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  correctResult: boolean;
  correctScore: boolean;
  createdAt: string;
};

const PRED_LABELS: Record<string, string> = { home: "主胜", away: "客胜", draw: "平" };

export default function PredictionsPage() {
  return <PredictionsClient />;
}

function PredictionsClient() {
  const { token, loading: authLoading } = useAuth();
  const [data, setData] = useState<Prediction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setLoading(false); return; }

    let cancelled = false;
    fetch("/api/predictions", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setData(json.data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, authLoading]);

  if (authLoading || loading) return <PredictionsSkeleton />;

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <span className="text-5xl">🔮</span>
        <h2 className="mt-5 text-xl font-bold text-slate-800">我的预测</h2>
        <p className="mt-2 text-sm text-slate-500">登录后查看你的预测历史</p>
        <Link href="/login" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">My Predictions</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">我的预测</h1>
        <p className="mt-3 text-sm text-slate-500">复盘模式 · 提交后即时揭晓真实比分</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="font-semibold">加载失败</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((p) => (
            <Link
              key={p.id}
              href={`/matches/${p.matchId}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">
                    {p.homeTeamName} vs {p.awayTeamName}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    真实比分：{p.homeScore} – {p.awayScore}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${
                    p.points >= 50 ? "bg-amber-100 text-amber-800" :
                    p.points > 0 ? "bg-emerald-100 text-emerald-800" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    +{p.points} 分
                  </span>
                </div>
              </div>

              {/* 预测详情 */}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-[12px]">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  预测：{PRED_LABELS[p.prediction] ?? p.prediction}
                </span>
                {p.predictedHomeScore !== null && p.predictedAwayScore !== null && (
                  <span className="text-slate-400">
                    比分预测：{p.predictedHomeScore} – {p.predictedAwayScore}
                  </span>
                )}
                <span className="ml-auto text-slate-400">
                  {p.correctScore ? "🎯 精准比分" : p.correctResult ? "✅ 胜负正确" : "❌ 未命中"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-5xl">🏟️</span>
          <h3 className="mt-5 text-lg font-semibold text-slate-700">暂无预测记录</h3>
          <p className="mt-2 text-sm text-slate-400">前往赛程页面，选择一场比赛开始你的首次预测</p>
          <Link href="/matches" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">
            查看赛程
          </Link>
        </div>
      )}
    </div>
  );
}

function PredictionsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10 h-20 animate-pulse rounded-xl bg-slate-100" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-4 h-24 animate-pulse rounded-2xl bg-slate-50" />
      ))}
    </div>
  );
}
