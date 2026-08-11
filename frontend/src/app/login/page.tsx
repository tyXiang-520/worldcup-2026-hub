"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "login"; // "login" | "register"
  const {
    token,
    user,
    loading: authLoading,
    login,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  // 已登录用户跳转首页
  if (!authLoading && token && user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg =
          body?.error?.message ??
          (isRegister ? "注册失败，请检查输入" : "用户名或密码错误");
        setError(msg);
        setSubmitting(false);
        return;
      }

      login(body.data.token, body.data.user);
      router.push("/");
    } catch {
      setError("网络请求失败，请稍后重试");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">
          {isRegister ? "Create Account" : "Welcome Back"}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          {isRegister ? "注册" : "登录"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isRegister ? "创建账号，参与预测竞猜" : "登录后参与预测和讨论"}
        </p>
      </div>

      {/* 表单 */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* 用户名 */}
        <label className="mb-5 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            用户名
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
            maxLength={16}
            pattern="^[a-zA-Z0-9_]+$"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400
                       focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="字母、数字或下划线"
          />
        </label>

        {/* 密码 */}
        <label className="mb-6 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            密码
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={6}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400
                       focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="至少 6 位"
          />
        </label>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow transition
                     hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? isRegister
              ? "注册中…"
              : "登录中…"
            : isRegister
              ? "注册"
              : "登录"}
        </button>

        {/* 切换登录/注册 */}
        <p className="mt-5 text-center text-[13px] text-slate-500">
          {isRegister ? "已有账号？" : "还没有账号？"}
          <a
            href={isRegister ? "/login" : "/login?mode=register"}
            className="ml-1 font-semibold text-blue-600 hover:text-blue-800"
          >
            {isRegister ? "去登录" : "立即注册"}
          </a>
        </p>
      </form>
    </div>
  );
}
