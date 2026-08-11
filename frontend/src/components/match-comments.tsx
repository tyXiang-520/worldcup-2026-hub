"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Comment = {
  id: number;
  content: string;
  username: string;
  likes: number;
  isPredictionCorrect: boolean;
  createdAt: string;
  replies?: Comment[];
};

export function MatchComments({ matchId }: { matchId: number }) {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/comments?matchId=${matchId}&sort=${sort}`)
      .then((r) => r.json())
      .then((j) => setComments(j.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matchId, sort]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !text.trim()) return;
    setLoading(true); setError(null);
    try {
      const body: Record<string, unknown> = { matchId, content: text.trim() };
      if (replyTo) body.parentId = replyTo;
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error?.message ?? "发表失败");
      } else {
        setText("");
        setReplyTo(null);
        load();
      }
    } catch { setError("网络错误"); }
    setLoading(false);
  }

  if (loading && !comments) return <div className="py-6 text-center text-sm text-slate-400">加载中…</div>;

  return (
    <div>
      {/* 排序 */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setSort("latest")} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${sort === "latest" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>最新</button>
        <button onClick={() => setSort("hot")} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${sort === "hot" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>最热</button>
      </div>

      {/* 发表区 */}
      {token ? (
        <form onSubmit={submit} className="mb-6">
          {replyTo && (
            <p className="mb-2 text-[12px] text-slate-500">
              正在回复 #{replyTo}{" "}
              <button type="button" onClick={() => setReplyTo(null)} className="text-blue-600">取消</button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none"
            rows={2}
            placeholder="发表你的看法…"
          />
          {error && <p className="mt-1 text-[12px] text-rose-500">{error}</p>}
          <button type="submit" disabled={!text.trim()} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            发表
          </button>
        </form>
      ) : (
        <div className="mb-6 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-[13px] text-slate-500"><Link href="/login" className="font-semibold text-blue-600">登录</Link>后参与讨论</p>
        </div>
      )}

      {/* 列表 */}
      {comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={() => setReplyTo(c.id)} token={token} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">暂无评论，快来发表第一条吧</p>
      )}
    </div>
  );
}

function CommentItem({ comment, onReply, token }: { comment: Comment; onReply: () => void; token: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
          {comment.username.charAt(0).toUpperCase()}
        </span>
        <span className="text-[13px] font-semibold text-slate-800">{comment.username}</span>
        {comment.isPredictionCorrect && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">🎯神预测</span>
        )}
        <span className="ml-auto text-[11px] text-slate-400">{formatTime(comment.createdAt)}</span>
      </div>
      <p className="mt-2 text-[14px] text-slate-700">{comment.content}</p>
      <div className="mt-2 flex gap-3 text-[12px] text-slate-400">
        <span>👍 {comment.likes}</span>
        {token && <button onClick={onReply} className="text-blue-600">回复</button>}
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
          {comment.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-semibold text-slate-700">{r.username}</span>
                {r.isPredictionCorrect && <span className="rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700">🎯</span>}
              </div>
              <p className="text-[13px] text-slate-600">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return iso; }
}
