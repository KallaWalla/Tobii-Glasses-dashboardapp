import { ClassAnalysisResult, ViewSegment } from "../types/Analysis"
import { AnalysisResponse } from "@/api/analysisApi"
import { Clock, Eye, BarChart2, ChevronDown } from "lucide-react"
import { useState } from "react"

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(sec: number) {
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(0).padStart(2, "0")
  return `${m}m ${s}s`
}

const COLORS = [
  "#4CA2D5", "#F4A261", "#16B0A5", "#A78BFA", "#F472B6",
  "#34D399", "#FB923C", "#60A5FA", "#E879F9", "#2DD4BF",
]

// ─── Merge segments that are close together ──────────────────────────────────
// GAP_THRESHOLD: max gap in frames before we consider it a new segment
// At 25fps, 12 frames = ~0.5s gap tolerance
const GAP_THRESHOLD_FRAMES = 12

function mergeSegments(segments: ViewSegment[], fps: number): ViewSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments].sort((a, b) => a.start_frame - b.start_frame)
  const merged: ViewSegment[] = []
  let current = { ...sorted[0] }

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    const gap = next.start_frame - current.end_frame

    if (gap <= GAP_THRESHOLD_FRAMES) {
      // Merge: extend current segment to cover next
      current.end_frame = Math.max(current.end_frame, next.end_frame)
    } else {
      merged.push(current)
      current = { ...next }
    }
  }
  merged.push(current)
  return merged
}

// ─── Timeline bar for a single class ────────────────────────────────────────

function TimelineBar({
  segments,
  totalDuration,
  color,
  fps,
}: {
  segments: ViewSegment[]
  totalDuration: number
  color: string
  fps: number
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="relative mt-2">
      <div className="relative h-7 rounded-full bg-slate-100 overflow-hidden">
        {segments.map((seg, i) => {
          const start = seg.start_frame / fps
          const end = seg.end_frame / fps
          const left = (start / totalDuration) * 100
          const width = Math.max(((end - start) / totalDuration) * 100, 0.4)

          return (
            <div
              key={i}
              className="absolute top-0 h-full rounded-sm cursor-pointer transition-opacity"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: color,
                opacity: hovered === i ? 1 : 0.75,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}
      </div>

      {hovered !== null && (
        <div
          className="absolute -top-8 text-xs bg-slate-800 text-white px-2 py-1 rounded-lg shadow pointer-events-none whitespace-nowrap z-10"
          style={{
            left: `${Math.min(
              (segments[hovered].start_frame / fps / totalDuration) * 100,
              85
            )}%`,
          }}
        >
          {(segments[hovered].start_frame / fps).toFixed(2)}s →{" "}
          {(segments[hovered].end_frame / fps).toFixed(2)}s
        </div>
      )}

      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
        <span>0s</span>
        <span>{fmt(totalDuration / 2)}</span>
        <span>{fmt(totalDuration)}</span>
      </div>
    </div>
  )
}

// ─── Single class row (expandable) ──────────────────────────────────────────

function ClassRow({
  cls,
  totalDuration,
  color,
  fps,
  rank,
}: {
  cls: ClassAnalysisResult
  totalDuration: number
  color: string
  fps: number
  rank: number
}) {
  const [open, setOpen] = useState(false)

  // Merge segments and recalculate total view time from merged segments
  const mergedSegments = mergeSegments(cls.view_segments, fps)
  const mergedViewTime = mergedSegments.reduce(
    (sum, seg) => sum + (seg.end_frame - seg.start_frame) / fps,
    0
  )
  const pct = ((mergedViewTime / totalDuration) * 100).toFixed(1)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{cls.class_name}</p>
          <p className="text-xs text-slate-400">{mergedSegments.length} segmenten</p>
        </div>

        <div
          className="px-3 py-1 rounded-full text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: color }}
        >
          {fmt(mergedViewTime)}
        </div>

        <div className="w-24 hidden sm:block shrink-0">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 text-right">{pct}%</p>
        </div>

        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50">
          <div className="pt-3">
            <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
              Tijdlijn
            </p>
            <TimelineBar
              segments={mergedSegments}
              totalDuration={totalDuration}
              color={color}
              fps={fps}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
              Segmenten
            </p>
            <div className="flex flex-wrap gap-2">
              {mergedSegments.map((seg, i) => {
                const s = (seg.start_frame / fps).toFixed(2)
                const e = (seg.end_frame / fps).toFixed(2)
                const dur = ((seg.end_frame - seg.start_frame) / fps).toFixed(2)
                return (
                  <div
                    key={i}
                    className="text-xs px-2.5 py-1.5 rounded-lg border font-mono"
                    style={{
                      borderColor: color + "55",
                      backgroundColor: color + "10",
                      color: color,
                    }}
                  >
                    {s}s → {e}s
                    <span className="opacity-60 ml-1">({dur}s)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AnalysisResults({ result }: { result: AnalysisResponse }) {
  const totalDuration = result.total_frames / result.fps

  const sorted = [...result.classes].sort(
    (a, b) => b.total_view_time_seconds - a.total_view_time_seconds
  )

  // Recalculate merged view times for summary
  const mergedViewTimes = sorted.map((cls) => {
    const merged = mergeSegments(cls.view_segments, result.fps)
    return merged.reduce((sum, seg) => sum + (seg.end_frame - seg.start_frame) / result.fps, 0)
  })

  const totalWatched = mergedViewTimes.reduce((s, t) => s + t, 0)

  // For the overview bar: use the longest item as 100% width so differences are visible
  const maxViewTime = Math.max(...mergedViewTimes, 0.001)

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#4CA2D5]/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-[#4CA2D5]" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Opnameduur</p>
            <p className="text-lg font-bold text-slate-800">{fmt(totalDuration)}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#16B0A5]/10 flex items-center justify-center">
            <Clock size={18} className="text-[#16B0A5]" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Totaal gekeken</p>
            <p className="text-lg font-bold text-slate-800">{fmt(totalWatched)}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F4A261]/10 flex items-center justify-center">
            <Eye size={18} className="text-[#F4A261]" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Voorwerpen</p>
            <p className="text-lg font-bold text-slate-800">{sorted.length}</p>
          </div>
        </div>
      </div>

      {/* Overview — bars relative to longest item, not totalDuration */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4">
        <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
          Overzicht kijktijd per voorwerp
        </p>
        <div className="space-y-2.5">
          {sorted.map((cls, i) => {
            const color = COLORS[i % COLORS.length]
            const viewTime = mergedViewTimes[i]
            // Width relative to the longest-watched item → always shows meaningful differences
            const pct = (viewTime / maxViewTime) * 100
            return (
              <div key={cls.class_id} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <p className="text-sm text-slate-700 w-36 truncate shrink-0">{cls.class_name}</p>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <p className="text-sm font-semibold text-slate-600 w-14 text-right shrink-0">
                  {fmt(viewTime)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-class expandable rows */}
      <div className="space-y-3">
        {sorted.map((cls, i) => (
          <ClassRow
            key={cls.class_id}
            cls={cls}
            totalDuration={totalDuration}
            color={COLORS[i % COLORS.length]}
            fps={result.fps}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  )
}