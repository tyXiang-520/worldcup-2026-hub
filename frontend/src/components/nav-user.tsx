"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function NavUser() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="ml-3 h-8 w-8 animate-pulse rounded-full bg-slate-200" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="ml-3 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="ml-3 flex items-center gap-2">
      <Link
        href="/me"
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[100px] truncate">{user.username}</span>
      </Link>
      <button
        onClick={logout}
        className="rounded-lg px-2 py-1.5 text-[12px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        退出
      </button>
    </div>
  );
}
