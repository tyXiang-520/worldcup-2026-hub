"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Post = { id: number; title: string; content: string; username: string; likes: number; createdAt: string };

export default function CommunityTeamPage() {
  const params = useParams();
  const teamId = Number(params.teamId);
  const { token } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/community/${teamId}/posts`)
      .then((r) => r.json())
      .then((j) => setPosts(j.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [teamId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setError(null);
    const res = await fetch(`/api/community/${teamId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: title.trim(), content: body.trim() }),
    });
    if (res.ok) { setTitle(""); setBody(""); load(); }
    else { const j = await res.json(); setError(j?.error?.message ?? "发帖失败"); }
  }

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-12"><Skeleton /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 发帖 */}
      {token ? (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="帖子标题（最多 80 字）"
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3}
            placeholder="分享你的看法…" className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none" />
          {error && <p className="mb-2 text-[12px] text-rose-500">{error}</p>}
          <button type="submit" disabled={!title.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">发布</button>
        </form>
      ) : (
        <div className="mb-8 rounded-xl bg-slate-50 p-4 text-center text-[13px] text-slate-500">
          <a href="/login" className="font-semibold text-blue-600">登录</a>后参与发帖
        </div>
      )}

      {/* 列表 */}
      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-slate-800">{p.title}</h3>
              <p className="mt-2 text-[14px] text-slate-600 whitespace-pre-wrap">{p.content}</p>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {p.username.charAt(0).toUpperCase()}
                </span>
                <span>{p.username}</span>
                <span>👍 {p.likes}</span>
                <span className="ml-auto">{p.createdAt.slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-slate-400">暂无帖文，快来发布第一条吧</p>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>;
}
