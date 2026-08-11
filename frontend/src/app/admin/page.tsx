"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Match = {
  id: number; date: string; stage: string;
  homeTeam: { name: string }; awayTeam: { name: string };
  homeScore: number | null; awayScore: number | null;
  summary: string | null;
};

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // 非 admin 显示拒绝
  const isAdmin = user?.username === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    fetch("/api/matches?stage=final")
      .then((r) => r.json())
      .then((j) => setMatches(j.data?.flatMap((g: any) => g.matches) ?? []))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  if (authLoading) return <div className="mx-auto max-w-2xl px-4 py-12">加载中…</div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="text-5xl">🚫</span>
      <h2 className="mt-4 text-xl font-bold text-slate-800">无权访问</h2>
      <p className="mt-2 text-sm text-slate-500">仅管理员可访问此页面</p>
      <Link href="/" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white">返回首页</Link>
    </div>
  );

  async function saveMatch(id: number, homeScore: number, awayScore: number, summary: string) {
    if (!token) return;
    setMsg(null);
    const res = await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ homeScore, awayScore, summary }),
    });
    if (res.ok) setMsg("✅ 保存成功");
    else { const j = await res.json(); setMsg(`❌ ${j?.error?.message ?? "失败"}`); }
  }

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-12">加载中…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-rose-700 uppercase">Admin</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">管理后台</h1>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2.5 text-[13px] font-medium">{msg}</div>}

      <div className="space-y-4">
        {matches?.map((m) => (
          <MatchEditor key={m.id} match={m} onSave={saveMatch} />
        ))}
      </div>
    </div>
  );
}

function MatchEditor({ match, onSave }: { match: Match; onSave: (id: number, hs: number, as: number, s: string) => void }) {
  const [hs, setHs] = useState(match.homeScore ?? 0);
  const [as, setAs] = useState(match.awayScore ?? 0);
  const [summary, setSummary] = useState(match.summary ?? "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[12px] font-semibold text-slate-500">{match.date} · {match.stage}</p>
      <p className="text-[14px] font-bold text-slate-800">{match.homeTeam.name} vs {match.awayTeam.name}</p>
      <div className="mt-3 flex items-center gap-3">
        <input type="number" min={0} value={hs} onChange={(e) => setHs(Number(e.target.value))}
          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm" />
        <span className="text-slate-300">–</span>
        <input type="number" min={0} value={as} onChange={(e) => setAs(Number(e.target.value))}
          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm" />
        <input value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话总结…" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <button onClick={() => onSave(match.id, hs, as, summary)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white">保存</button>
      </div>
    </div>
  );
}
