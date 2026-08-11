"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function MePage() {
  const { user, token, loading, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 未登录跳转
  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!user) return null;

  async function togglePrivacy(field: "allowLeaderboard" | "allowPredictionView", value: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        await refreshProfile();
        setMessage("设置已保存");
      } else {
        const body = await res.json();
        setMessage(body?.error?.message ?? "保存失败");
      }
    } catch {
      setMessage("网络请求失败");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 头部 */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-900 p-8 text-white shadow-xl sm:p-10">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold shadow-inner ring-1 ring-white/20">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{user.username}</h1>
            <p className="mt-1 text-[13px] text-blue-200">
              注册于 {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* 操作卡片 */}
      <div className="mt-8 space-y-5">
        {/* 隐私设置 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-800">隐私设置</h2>

          {message && (
            <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2.5 text-[13px] font-medium text-slate-600">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[14px] font-semibold text-slate-700">
                  公开排行榜
                </span>
                <p className="mt-0.5 text-[12px] text-slate-400">
                  关闭后，你的用户名不会出现在积分排行榜中
                </p>
              </div>
              <Toggle
                checked={user.allowLeaderboard}
                onChange={(v) => togglePrivacy("allowLeaderboard", v)}
                disabled={saving}
              />
            </label>

            <label className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-[14px] font-semibold text-slate-700">
                  预测记录可见
                </span>
                <p className="mt-0.5 text-[12px] text-slate-400">
                  关闭后，其他用户无法查看你的预测历史
                </p>
              </div>
              <Toggle
                checked={user.allowPredictionView}
                onChange={(v) => togglePrivacy("allowPredictionView", v)}
                disabled={saving}
              />
            </label>
          </div>
        </section>

        {/* 退出登录 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            onClick={logout}
            className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            退出登录
          </button>
        </section>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-300"
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return iso;
  }
}
