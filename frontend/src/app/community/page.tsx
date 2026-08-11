"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Team = { teamId: number; teamName: string; memberCount: number; latestPostTitle: string | null };

export default function CommunityPage() {
  const [data, setData] = useState<Team[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/community")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-12"><Skeleton /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">Community</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">球队圈子</h1>
        <p className="mt-3 text-sm text-slate-500">加入支持的球队，和球迷一起讨论</p>
      </div>

      <div className="grid gap-3">
        {data?.map((t) => (
          <Link key={t.teamId} href={`/community/${t.teamId}`}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg">🏳️</span>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-800">{t.teamName}</p>
              <p className="text-[12px] text-slate-400">{t.memberCount} 帖 · {t.latestPostTitle ?? "暂无帖文"}</p>
            </div>
            <span className="text-[12px] text-slate-300">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
