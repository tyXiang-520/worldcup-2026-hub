import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-10 text-white shadow-xl sm:p-16">
        <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-blue-200 uppercase">
          2026 FIFA World Cup
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          美加墨世界杯
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-blue-100 sm:text-lg">
          赛事数据一站式浏览。赛程、阵容、球员评分，以及即将上线的比分预测和球迷社区。
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-800 shadow transition hover:bg-blue-50"
          >
            查看赛程
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/api/health"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            检查 API
          </Link>
        </div>
      </div>

      {/* 数据概览 */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <QuickCard icon="🏟️" label="比赛" value="104" />
        <QuickCard icon="🌍" label="球队" value="48" />
        <QuickCard icon="👤" label="球员" value="736+" />
      </div>

      {/* 底部 */}
      <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          Next.js · Midway.js · SQLite · OpenAPI · Tailwind CSS
        </p>
        <p className="mt-2 text-[13px] text-slate-400">
          Web 全栈开发课程项目
        </p>
      </div>
    </main>
  );
}

function QuickCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-3xl">{icon}</span>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[13px] text-slate-500">{label}</p>
    </div>
  );
}
