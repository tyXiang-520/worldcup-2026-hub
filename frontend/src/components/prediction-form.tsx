"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Props = {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  onPredicted?: () => void;
};

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  onPredicted,
}: Props) {
  const { token } = useAuth();

  // 未登录
  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
        <span className="text-4xl">🔮</span>
        <p className="mt-3 text-sm font-semibold text-slate-600">参与预测竞猜</p>
        <p className="mt-1 text-[13px] text-slate-400">
          登录后即可提交你的比分预测
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <PredictionFormInner
      matchId={matchId}
      homeTeamName={homeTeamName}
      awayTeamName={awayTeamName}
      homeScore={homeScore}
      awayScore={awayScore}
      token={token}
      onPredicted={onPredicted}
    />
  );
}

function PredictionFormInner({
  matchId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  token,
  onPredicted,
}: Props & { token: string }) {
  const [prediction, setPrediction] = useState<"home" | "away" | "draw" | null>(null);
  const [predHome, setPredHome] = useState("");
  const [predAway, setPredAway] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    points: number;
    correctResult: boolean;
    correctScore: boolean;
    actualHome: number;
    actualAway: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!prediction) return;
    setSubmitting(true); setError(null);
    try {
      const body: Record<string, unknown> = { matchId, prediction };
      if (predHome && predAway) {
        body.homeScore = Number(predHome);
        body.awayScore = Number(predAway);
      }
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "提交失败");
      } else {
        const d = json.data;
        setResult({
          points: d.points,
          correctResult: d.correctResult,
          correctScore: d.correctScore,
          actualHome: d.homeScore,
          actualAway: d.awayScore,
        });
        onPredicted?.();
      }
    } catch {
      setError("网络请求失败");
    }
    setSubmitting(false);
  }

  // 已提交
  if (result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <span className="text-4xl">{result.points > 0 ? "🎉" : "😅"}</span>
          <p className="mt-3 text-lg font-bold text-slate-800">
            获得 <span className="text-blue-600">{result.points}</span> 分
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {result.correctScore
              ? "精准比分预测！+50 分"
              : result.correctResult
                ? "胜负预测正确！+10 分"
                : "很遗憾，预测未命中"}
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[13px] text-slate-500">实际比分</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">
              {homeTeamName} {result.actualHome} – {result.actualAway} {awayTeamName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-800">预测结果</h3>

      {/* 胜平负 */}
      <div className="mb-5">
        <p className="mb-2 text-[13px] font-semibold text-slate-600">
          胜平负预测 <span className="text-rose-500">*</span>
        </p>
        <div className="flex gap-2">
          <PredBtn
            label={homeTeamName}
            sub="主胜"
            active={prediction === "home"}
            onClick={() => setPrediction("home")}
            color="blue"
          />
          <PredBtn
            label="平"
            sub="平局"
            active={prediction === "draw"}
            onClick={() => setPrediction("draw")}
            color="slate"
          />
          <PredBtn
            label={awayTeamName}
            sub="客胜"
            active={prediction === "away"}
            onClick={() => setPrediction("away")}
            color="rose"
          />
        </div>
      </div>

      {/* 比分 */}
      <div className="mb-5">
        <p className="mb-2 text-[13px] font-semibold text-slate-600">
          精准比分 <span className="text-[12px] font-normal text-slate-400">（可选，猜中+50分）</span>
        </p>
        <p className="mb-2 text-[11px] text-slate-400">
          猜中比分自动发放全额积分，无需额外选择胜负
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-slate-700">{homeTeamName}</span>
          <input
            type="number"
            min={0} max={20}
            value={predHome}
            onChange={(e) => setPredHome(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="?"
          />
          <span className="text-slate-300">–</span>
          <input
            type="number"
            min={0} max={20}
            value={predAway}
            onChange={(e) => setPredAway(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="?"
          />
          <span className="text-[13px] font-semibold text-slate-700">{awayTeamName}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!prediction || submitting}
        className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "提交中…" : "提交预测"}
      </button>
    </div>
  );
}

function PredBtn({
  label,
  sub,
  active,
  onClick,
  color,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
  color: "blue" | "rose" | "slate";
}) {
  const colorMap = {
    blue: active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-blue-50",
    rose: active ? "bg-rose-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-rose-50",
    slate: active ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center rounded-xl px-3 py-3 text-center transition ${colorMap[color]}`}
    >
      <span className="text-[13px] font-bold">{label}</span>
      <span className={`mt-0.5 text-[11px] ${active ? "opacity-70" : "opacity-50"}`}>{sub}</span>
    </button>
  );
}
