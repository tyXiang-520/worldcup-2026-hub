"use client";

import { STAGE_LABELS, STAGE_ORDER } from "@/lib/types";

type Props = {
  selected: string | undefined;
  onChange: (stage: string | undefined) => void;
};

export function StageFilter({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
          selected === undefined
            ? "bg-slate-900 text-white shadow"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        全部
      </button>
      {STAGE_ORDER.map((stage) => (
        <button
          key={stage}
          onClick={() => onChange(stage)}
          className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
            selected === stage
              ? "bg-slate-900 text-white shadow"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {STAGE_LABELS[stage] ?? stage}
        </button>
      ))}
    </div>
  );
}
