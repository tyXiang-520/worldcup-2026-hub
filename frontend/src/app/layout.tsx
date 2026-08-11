import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/auth";
import { NavUser } from "@/components/nav-user";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界杯 · 赛事互动平台",
  description: "2026 美加墨世界杯 · 赛事数据与互动预测平台",
};

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/matches", label: "赛程" },
  { href: "/predictions", label: "预测" },
  { href: "/leaderboard", label: "排行" },
  { href: "/community", label: "社区" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50">
        <AuthProvider>
          <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 transition hover:text-blue-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
                  ⚽
                </span>
                世界杯 2026
              </Link>
              <div className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}
                <NavUser />
              </div>
            </div>
          </nav>

          {children}

          <footer className="border-t border-slate-200 bg-white py-10 text-center">
            <p className="text-[13px] text-slate-400">
              2026 FIFA World Cup · 课程项目 · Next.js + Midway.js + SQLite
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
