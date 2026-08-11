"use client";

import { useEffect, useState, useCallback } from "react";
import type { MatchGroup } from "@/lib/types";
import { fetchMatches } from "@/lib/api";
import { MatchCard } from "@/components/match-card";
import { StageFilter } from "@/components/stage-filter";

export function MatchesPageClient({
  initialData,
  initialError,
}: {
  initialData: MatchGroup[] | null;
  initialError: string | null;
}) {
  const [data, setData] = useState<MatchGroup[] | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [stage, setStage] = useState<string | undefined>(undefined);

  const loadData = useCallback((s?: string) => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMatches(s)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "请求失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage === undefined && initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    return loadData(stage);
  }, [stage, loadData, initialData]);

  const handleStageChange = useCallback((newStage: string | undefined) => {
    setStage(newStage);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">
          Match Schedule
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          赛程
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          2026 美加墨世界杯 · 48 支球队 · 104 场比赛
        </p>
      </div>

      {/* 筛选器 */}
      <div className="mb-10">
        <StageFilter selected={stage} onChange={handleStageChange} />
      </div>

      {/* 四态 */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setStage(stage)} />
      ) : data && data.length === 0 ? (
        <EmptyState />
      ) : data ? (
        <div className="space-y-12">
          {data.map((group) => (
            <section key={group.date} aria-labelledby={`date-${group.date}`}>
              <h2
                id={`date-${group.date}`}
                className="mb-5 flex items-center gap-3 text-lg font-bold text-slate-800"
              >
                <span className="block h-1 w-6 rounded-full bg-blue-600" />
                {formatDate(group.date)}
                <span className="ml-auto text-sm font-normal text-slate-400">
                  {group.matches.length} 场
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-10">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="mb-5 h-6 w-44 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((j) => (
              <div
                key={j}
                className="h-44 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl">🏟️</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-700">暂无赛事</h3>
      <p className="mt-2 text-sm text-slate-400">
        当前筛选条件下没有匹配的比赛
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl">⚠️</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-700">加载失败</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        重新加载
      </button>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekDays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekDays[d.getDay()];
  return `${m}月${day}日 ${wd}`;
}
