import type { MonthMinutes } from "../api/estimate";
import { minutesToColor } from "../model/colorScale";
import { isAchievable, needsSupplement, SUPPLEMENT_MINUTES } from "../model/thresholds";

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Top of the chart; months at or above it render full-height. */
const SCALE_MINUTES = 180;
const MIN_BAR_PCT = 6;
const THRESHOLD_PCT = (SUPPLEMENT_MINUTES / SCALE_MINUTES) * 100;

/** Diagonal hatching marks "not achievable" by pattern, not just by a dark colour. */
const HATCH =
  "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.28) 0 2px, transparent 2px 6px)";

interface Props {
  monthly: MonthMinutes[];
  currentMonth: number;
  /** Tapping a bar selects that month. */
  onSelectMonth?: (month: number) => void;
}

function barTitle(m: MonthMinutes): string {
  const name = FULL_MONTHS[m.month - 1];
  if (!isAchievable(m.minutes)) return `${name}: not achievable`;
  if (m.minutes > SUPPLEMENT_MINUTES) return `${name}: ${Math.round(m.minutes)} min (over ${SUPPLEMENT_MINUTES})`;
  return `${name}: ${Math.round(m.minutes)} min`;
}

export function MonthChart({ monthly, currentMonth, onSelectMonth }: Props) {
  return (
    <div role="group" aria-label="Midday sun needed each month">
      <div className="relative h-20">
        <div className="absolute inset-y-0 left-0 right-7 flex items-end gap-1">
          {monthly.map((m) => {
            const hard = needsSupplement(m.minutes);
            const achievable = isAchievable(m.minutes);
            const heightPct = isAchievable(m.minutes)
              ? Math.min(100, Math.max(MIN_BAR_PCT, (m.minutes / SCALE_MINUTES) * 100))
              : 100;
            const isCurrent = m.month === currentMonth;
            // Same scale the map tiles use, so bar colors match the map
            const [r, g, b] = minutesToColor(m.minutes, m.minutes === null, false);
            return (
              <button
                key={m.month}
                type="button"
                title={barTitle(m)}
                aria-label={barTitle(m)}
                aria-pressed={isCurrent}
                onClick={() => onSelectMonth?.(m.month)}
                data-testid={`month-bar-${m.month}`}
                data-hard={hard ? "true" : "false"}
                data-current={isCurrent ? "true" : "false"}
                className="group flex h-full flex-1 cursor-pointer items-end rounded-t-sm"
              >
                <div
                  className="w-full rounded-t-sm transition-[filter] group-hover:brightness-125"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: `rgb(${r},${g},${b})`,
                    backgroundImage: achievable ? undefined : HATCH,
                  }}
                />
              </button>
            );
          })}
        </div>
        {/* Supplement threshold */}
        <div
          className="pointer-events-none absolute left-0 right-7 border-t border-dashed border-white/40"
          style={{ bottom: `${THRESHOLD_PCT}%` }}
        >
          <span className="absolute left-full ml-1.5 top-0 -translate-y-1/2 whitespace-nowrap text-[11px] leading-none text-gray-300">
            2 h
          </span>
        </div>
      </div>
      <div className="flex gap-1 mt-1 pr-7" aria-hidden="true">
        {monthly.map((m) => {
          const isCurrent = m.month === currentMonth;
          return (
            <span key={m.month} className="flex flex-1 flex-col items-center gap-0.5">
              <span className={`text-[11px] leading-none ${isCurrent ? "font-semibold text-amber-400" : "text-gray-400"}`}>
                {MONTH_INITIALS[m.month - 1]}
              </span>
              <span className={`h-0.5 w-3 rounded-full ${isCurrent ? "bg-amber-400" : "bg-transparent"}`} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
