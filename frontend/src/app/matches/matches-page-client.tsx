"use client";

import { useEffect, useState, useCallback } from "react";
import type { MatchGroup } from "@/lib/types";
import { fetchMatches } from "@/lib/api";
import { MatchCard } from "@/components/match-card";
import { StageFilter } from "@/components/stage-filter";
import { StatsTabs } from "@/components/stats-tabs";

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

      {/* 5 个 Tab：赛程 + 晋级图 + 射手榜 + 助攻榜 + 积分榜 */}
      <StatsTabs
        matchData={data}
        matchLoading={loading}
        matchError={error}
        stage={stage}
        onStageChange={handleStageChange}
        onRetry={() => loadData(stage)}
      />
    </div>
  );
}
