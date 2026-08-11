"use client";

import Link from "next/link";
import type { Match } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";

export function MatchCard({ match }: { match: Match }) {
  const isKnockout = match.stage !== "group-1" && match.stage !== "group-2" && match.stage !== "group-3";
  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;
  const groupLabel = match.group ? ` · ${match.group}组` : "";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm
                 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {/* 阶段 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          {stageLabel}{groupLabel}
        </span>
        {isKnockout && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            淘汰赛
          </span>
        )}
      </div>

      {/* 双方比分 */}
      <div className="flex items-center justify-between gap-3">
        {/* 主队 */}
        <TeamSide team={match.homeTeam} side="home" />
        {/* 比分 */}
        <ScoreBox match={match} />
        {/* 客队 */}
        <TeamSide team={match.awayTeam} side="away" />
      </div>

      {/* 卡片底部 */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[13px] text-slate-400">
          {match.venue ?? match.date}
        </span>
        {match.summary && (
          <span className="max-w-[60%] truncate text-right text-[13px] font-medium text-slate-600">
            {match.summary}
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamSide({ team, side }: { team: Match["homeTeam"]; side: "home" | "away" }) {
  return (
    <div className={`flex w-[120px] flex-col items-center gap-3 ${side === "away" ? "order-last" : "order-first"}`}>
      {/* 队徽 */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl shadow-inner ring-1 ring-slate-200/60 overflow-hidden">
        {team.flagUrl ? (
          <img src={team.flagUrl} alt={team.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl">🏳️</span>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold leading-tight text-slate-800">
          {team.name}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{team.nameEn}</p>
      </div>
    </div>
  );
}

function ScoreBox({ match }: { match: Match }) {
  const hasScore =
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.status === "finished";

  return (
    <div className="flex flex-col items-center gap-1">
      {hasScore ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {match.homeScore}
            </span>
            <span className="text-lg font-light text-slate-300">–</span>
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {match.awayScore}
            </span>
          </div>
          {match.homePenalty !== null && match.awayPenalty !== null && (
            <span className="text-[11px] text-slate-400">
              ({match.homePenalty} – {match.awayPenalty} 点球)
            </span>
          )}
          <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            已结束
          </span>
        </>
      ) : (
        <>
          <span className="text-xl font-bold text-slate-400">VS</span>
          <span className="mt-1 text-[11px] text-slate-400">
            {match.kickoffTime ?? "待定"}
          </span>
        </>
      )}
    </div>
  );
}
