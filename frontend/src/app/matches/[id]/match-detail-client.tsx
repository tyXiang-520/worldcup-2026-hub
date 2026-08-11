"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { MatchDetail, LineupPlayer } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { fetchMatchDetail } from "@/lib/api";
import { EventTimeline } from "@/components/event-timeline";

type Props = {
  matchId: number;
  initialData: MatchDetail | null;
  initialError: string | null;
};

const TABS = [
  { key: "overview", label: "赛况" },
  { key: "lineup", label: "阵容" },
  { key: "ratings", label: "评分" },
  { key: "discussion", label: "讨论" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function MatchDetailClient({ initialData, initialError }: Props) {
  const params = useParams();
  const matchId = Number(params.id);
  const [data, setData] = useState<MatchDetail | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (initialData && initialData.match.id === matchId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMatchDetail(matchId)
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
  }, [matchId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 h-5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        <div className="mt-10 h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="mt-4 text-xl font-bold text-slate-800">
          {error ? "加载失败" : "比赛不存在"}
        </h2>
        {error && <p className="mt-2 text-sm text-slate-500">{error}</p>}
        <Link
          href="/matches"
          className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          返回赛程
        </Link>
      </div>
    );
  }

  const { match, events, lineups, ratings } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 返回链接 */}
      <Link
        href="/matches"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800"
      >
        <span aria-hidden>←</span> 返回赛程
      </Link>

      {/* 比赛头部 Hero */}
      <MatchHero match={match} />

      {/* Tab 切换 */}
      <nav
        className="mb-8 mt-10 flex gap-1 rounded-xl bg-slate-100 p-1"
        role="tablist"
      >
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
      {activeTab === "overview" && (
        <OverviewTab
          match={match}
          events={events}
          homeName={match.homeTeam.name}
          awayName={match.awayTeam.name}
        />
      )}
      {activeTab === "lineup" && <LineupTab lineups={lineups} />}
      {activeTab === "ratings" && <RatingsTab ratings={ratings} />}
      {activeTab === "discussion" && <DiscussionTab />}
    </div>
  );
}

/* ================================================================
 * MatchHero
 * ================================================================ */
function MatchHero({ match }: { match: MatchDetail["match"] }) {
  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-8 text-white shadow-xl sm:p-12">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur">
          {stageLabel}
        </span>
        {match.group && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] backdrop-blur">
            {match.group}组
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-6">
        {/* 主队 */}
        <div className="flex flex-1 flex-col items-center gap-3 text-center">
          <Link
            href={`/teams/${match.homeTeam.id}`}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl shadow-inner ring-1 ring-white/20 transition hover:bg-white/20"
          >
            🏳️
          </Link>
          <Link
            href={`/teams/${match.homeTeam.id}`}
            className="text-lg font-bold transition hover:text-blue-300 sm:text-xl"
          >
            {match.homeTeam.name}
          </Link>
          <p className="text-[13px] text-slate-300">{match.homeTeam.nameEn}</p>
        </div>

        {/* 比分 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <span className="text-5xl font-bold tabular-nums sm:text-6xl">
              {match.homeScore ?? "—"}
            </span>
            <span className="text-3xl font-thin text-white/50">–</span>
            <span className="text-5xl font-bold tabular-nums sm:text-6xl">
              {match.awayScore ?? "—"}
            </span>
          </div>
          {match.homePenalty !== null && match.awayPenalty !== null && (
            <span className="mt-2 text-sm text-slate-300">
              点球 ({match.homePenalty} – {match.awayPenalty})
            </span>
          )}
          <span className="mt-3 rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium backdrop-blur">
            已结束
          </span>
        </div>

        {/* 客队 */}
        <div className="flex flex-1 flex-col items-center gap-3 text-center">
          <Link
            href={`/teams/${match.awayTeam.id}`}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl shadow-inner ring-1 ring-white/20 transition hover:bg-white/20"
          >
            🏳️
          </Link>
          <Link
            href={`/teams/${match.awayTeam.id}`}
            className="text-lg font-bold transition hover:text-blue-300 sm:text-xl"
          >
            {match.awayTeam.name}
          </Link>
          <p className="text-[13px] text-slate-300">{match.awayTeam.nameEn}</p>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
        <span className="text-[13px] text-slate-300">
          {match.date}
          {match.kickoffTime ? ` · ${match.kickoffTime}` : ""}
          {match.venue ? ` · ${match.venue}` : ""}
        </span>
        {match.summary && (
          <span className="max-w-md text-right text-sm font-medium text-amber-300">
            {match.summary}
          </span>
        )}
      </div>
    </div>
  );
}

/* ================================================================
 * OverviewTab
 * ================================================================ */
function OverviewTab({
  match,
  events,
  homeName,
  awayName,
}: {
  match: MatchDetail["match"];
  events: MatchDetail["events"];
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="events-heading">
        <h3
          id="events-heading"
          className="mb-5 text-lg font-bold text-slate-800"
        >
          比赛事件
        </h3>
        <EventTimeline
          events={events}
          homeTeamName={homeName}
          awayTeamName={awayName}
        />
      </section>

      <section aria-labelledby="stats-heading">
        <h3
          id="stats-heading"
          className="mb-5 text-lg font-bold text-slate-800"
        >
          技术统计
        </h3>
        <StatsComparison match={match} />
      </section>
    </div>
  );
}

function StatsComparison({ match }: { match: MatchDetail["match"] }) {
  const statsItems = [
    { label: "控球率", homeVal: "52%", awayVal: "48%", homePct: 52, awayPct: 48 },
    { label: "射门", homeVal: "14", awayVal: "9", homePct: 61, awayPct: 39 },
    { label: "射正", homeVal: "6", awayVal: "3", homePct: 67, awayPct: 33 },
    { label: "角球", homeVal: "7", awayVal: "4", homePct: 64, awayPct: 36 },
    { label: "犯规", homeVal: "11", awayVal: "14", homePct: 44, awayPct: 56 },
    { label: "传球成功率", homeVal: "87%", awayVal: "83%", homePct: 51, awayPct: 49 },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-[13px] font-semibold">
        <span className="text-slate-600">{match.homeTeam.name}</span>
        <span className="text-[11px] text-slate-400">vs</span>
        <span className="text-slate-600">{match.awayTeam.name}</span>
      </div>

      <div className="space-y-5">
        {statsItems.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-semibold tabular-nums text-slate-700">
                {item.homeVal}
              </span>
              <span className="text-[12px] text-slate-400">{item.label}</span>
              <span className="font-semibold tabular-nums text-slate-700">
                {item.awayVal}
              </span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="rounded-full bg-blue-600 transition-all"
                style={{ width: `${item.homePct}%` }}
              />
              <div className="w-1 shrink-0 bg-white" />
              <div
                className="rounded-full bg-rose-500 transition-all"
                style={{ width: `${item.awayPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
 * LineupTab
 * ================================================================ */
function LineupTab({ lineups }: { lineups: MatchDetail["lineups"] }) {
  const { home, away } = lineups;
  const hasData = home.starting.length > 0 || away.starting.length > 0;

  if (!hasData) {
    return (
      <div className="py-16 text-center">
        <span className="text-5xl">📋</span>
        <p className="mt-4 text-sm text-slate-400">暂无阵容数据</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <LineupCard lineup={home} />
      <LineupCard lineup={away} />
    </div>
  );
}

function LineupCard({
  lineup,
}: {
  lineup: {
    formation: string;
    starting: LineupPlayer[];
    substitutes: LineupPlayer[];
  };
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[12px] font-semibold text-blue-700">
          首发 11 人
        </span>
        <span className="text-[13px] text-slate-400">{lineup.formation}</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {lineup.starting.map((p) => (
          <li key={p.playerId} className="flex items-center gap-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold tabular-nums text-slate-600">
              {p.number}
            </span>
            <Link
              href={`/players/${p.playerId}`}
              className="text-[14px] font-medium text-slate-800 transition hover:text-blue-600"
            >
              {p.name}
            </Link>
            {p.position && (
              <span className="ml-auto text-[12px] text-slate-400">
                {p.position}
              </span>
            )}
          </li>
        ))}
      </ul>

      {lineup.substitutes.length > 0 && (
        <>
          <div className="mb-3 mt-6">
            <span className="rounded-md bg-slate-50 px-2.5 py-0.5 text-[12px] font-semibold text-slate-500">
              替补
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {lineup.substitutes.map((p) => (
              <li key={p.playerId} className="flex items-center gap-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-[12px] font-bold tabular-nums text-slate-400">
                  {p.number}
                </span>
                <span className="text-[14px] text-slate-500">{p.name}</span>
                {p.position && (
                  <span className="ml-auto text-[12px] text-slate-400">
                    {p.position}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ================================================================
 * RatingsTab
 * ================================================================ */
function RatingsTab({ ratings }: { ratings: MatchDetail["ratings"] }) {
  const { home, away } = ratings;
  const hasData = home.length > 0 || away.length > 0;

  if (!hasData) {
    return (
      <div className="py-16 text-center">
        <span className="text-5xl">⭐</span>
        <p className="mt-4 text-sm text-slate-400">暂无评分数据</p>
      </div>
    );
  }

  const maxRating = Math.max(
    ...home.map((r) => r.rating),
    ...away.map((r) => r.rating),
    0,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <RatingCard ratings={home} maxRating={maxRating} />
      <RatingCard ratings={away} maxRating={maxRating} />
    </div>
  );
}

function RatingCard({
  ratings,
  maxRating,
}: {
  ratings: { playerId: number; number: number; name: string; rating: number }[];
  maxRating: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <ul className="divide-y divide-slate-100">
        {ratings.map((p) => {
          const isTop = p.rating === maxRating;
          return (
            <li key={p.playerId} className="flex items-center gap-3 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold tabular-nums text-slate-600">
                {p.number}
              </span>
              <Link
                href={`/players/${p.playerId}`}
                className="flex-1 text-[14px] font-medium text-slate-800 transition hover:text-blue-600"
              >
                {p.name}
              </Link>
              <span
                className={`rounded-lg px-3 py-1 text-[13px] font-bold tabular-nums ${
                  isTop
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                {p.rating.toFixed(1)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ================================================================
 * DiscussionTab（占位）
 * ================================================================ */
function DiscussionTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl">💬</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-700">
        讨论区即将上线
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        本场比赛的赛前/赛中/赛后讨论功能正在开发中，敬请期待。
      </p>
    </div>
  );
}
