import type { MonthMinutes } from "../api/estimate";
import { minutesToColor } from "../model/colorScale";

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Bar heights are scaled against this; months at or above it render full-height. */
const CAP_MINUTES = 120;
const MIN_BAR_PCT = 6;

interface Props {
  monthly: MonthMinutes[];
  currentMonth: number;
}

function barTitle(m: MonthMinutes): string {
  const name = FULL_MONTHS[m.month - 1];
  if (m.minutes === null) return `${name}: not possible`;
  if (m.minutes > CAP_MINUTES) return `${name}: ${Math.round(m.minutes)} min (over ${CAP_MINUTES})`;
  return `${name}: ${Math.round(m.minutes)} min`;
}

export function MonthChart({ monthly, currentMonth }: Props) {
  return (
    <div>
      <div className="flex items-end gap-[3px] h-14" role="img" aria-label="Required sun minutes by month">
        {monthly.map((m) => {
          const hard = m.minutes === null || m.minutes > CAP_MINUTES;
          const heightPct = hard
            ? 100
            : Math.max(MIN_BAR_PCT, (m.minutes! / CAP_MINUTES) * 100);
          const isCurrent = m.month === currentMonth;
          // Same scale the map tiles use, so bar colors match the map
          const [r, g, b] = minutesToColor(m.minutes, m.minutes === null, false);
          const opacity = isCurrent ? "opacity-100" : "opacity-40";
          return (
            <div
              key={m.month}
              title={barTitle(m)}
              data-testid={`month-bar-${m.month}`}
              data-hard={hard ? "true" : "false"}
              data-current={isCurrent ? "true" : "false"}
              className="flex-1 flex items-end h-full"
            >
              <div
                className={`w-full rounded-t-sm ${opacity}`}
                style={{ height: `${heightPct}%`, backgroundColor: `rgb(${r},${g},${b})` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-0.5">
        {monthly.map((m) => (
          <span
            key={m.month}
            className={`flex-1 text-center text-[9px] ${
              m.month === currentMonth ? "text-amber-400 font-semibold" : "text-gray-500"
            }`}
          >
            {MONTH_INITIALS[m.month - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}
