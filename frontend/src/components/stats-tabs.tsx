"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchGroup } from "@/lib/types";
import { MatchCard } from "@/components/match-card";
import { StageFilter } from "@/components/stage-filter";
import { BracketView } from "@/app/matches/bracket-view";
import { TopScorers } from "@/app/matches/top-scorers";
import { TopAssists } from "@/app/matches/top-assists";
import { StandingsView } from "@/app/matches/standings-view";

const TABS = [
  { key: "matches", label: "赛程" },
  { key: "bracket", label: "晋级图" },
  { key: "scorers", label: "射手榜" },
  { key: "assists", label: "助攻榜" },
  { key: "standings", label: "积分榜" },
] as const;

type Tab = (typeof TABS)[number]["key"];

type Props = {
  matchData: MatchGroup[] | null;
  matchLoading: boolean;
  matchError: string | null;
  stage: string | undefined;
  onStageChange: (s: string | undefined) => void;
  onRetry: () => void;
};

export function StatsTabs({
  matchData,
  matchLoading,
  matchError,
  stage,
  onStageChange,
  onRetry,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  return (
    <>
      {/* Tab 导航 */}
      <nav className="mb-10 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab 内容 */}
      {activeTab === "matches" && (
        <MatchesContent
          data={matchData}
          loading={matchLoading}
          error={matchError}
          stage={stage}
          onStageChange={onStageChange}
          onRetry={onRetry}
        />
      )}
      {activeTab === "bracket" && <BracketView />}
      {activeTab === "scorers" && <TopScorers />}
      {activeTab === "assists" && <TopAssists />}
      {activeTab === "standings" && <StandingsView />}
    </>
  );
}

/* ================================================================
 * 赛程内容（从原 MatchesPageClient 搬过来）
 * ================================================================ */
function MatchesContent({
  data,
  loading,
  error,
  stage,
  onStageChange,
  onRetry,
}: {
  data: MatchGroup[] | null;
  loading: boolean;
  error: string | null;
  stage: string | undefined;
  onStageChange: (s: string | undefined) => void;
  onRetry: () => void;
}) {
  return (
    <>
      {/* 筛选器 */}
      <div className="mb-10">
        <StageFilter selected={stage} onChange={onStageChange} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
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
    </>
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
              <div key={j} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
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
      <p className="mt-2 text-sm text-slate-400">当前筛选条件下没有匹配的比赛</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
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
  const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekDays[d.getDay()];
  return `${m}月${day}日 ${wd}`;
}
