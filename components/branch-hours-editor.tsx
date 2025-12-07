"use client";

import { useState } from "react";

const DAYS: Array<keyof OpeningHours> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS: Record<keyof OpeningHours, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type OpeningHoursDay = {
  open: string | null; // "HH:MM"
  close: string | null;
  closed: boolean;
};

export type OpeningHours = {
  monday: OpeningHoursDay;
  tuesday: OpeningHoursDay;
  wednesday: OpeningHoursDay;
  thursday: OpeningHoursDay;
  friday: OpeningHoursDay;
  saturday: OpeningHoursDay;
  sunday: OpeningHoursDay;
};

type BranchHoursEditorProps = {
  value: OpeningHours | null;
  onChange: (value: OpeningHours) => void;
};

function makeDefaultDay(): OpeningHoursDay {
  return {
    open: "09:00",
    close: "22:00",
    closed: false,
  };
}

function ensureOpeningHours(value: OpeningHours | null): OpeningHours {
  const base: OpeningHours = {
    monday: makeDefaultDay(),
    tuesday: makeDefaultDay(),
    wednesday: makeDefaultDay(),
    thursday: makeDefaultDay(),
    friday: makeDefaultDay(),
    saturday: makeDefaultDay(),
    sunday: makeDefaultDay(),
  };

  if (!value) return base;

  const result: OpeningHours = { ...base };
  for (const day of DAYS) {
    result[day] = {
      ...base[day],
      ...(value[day] ?? {}),
    };
  }
  return result;
}

export function BranchHoursEditor({ value, onChange }: BranchHoursEditorProps) {
  const [local, setLocal] = useState<OpeningHours>(() =>
    ensureOpeningHours(value)
  );

  const getMeridiem = (timeValue: string | null) => {
    if (!timeValue) return "AM";
    const [hourString] = timeValue.split(":");
    const hour = Number(hourString);
    return Number.isFinite(hour) && hour >= 12 ? "PM" : "AM";
  };

const updateDay = (day: keyof OpeningHours, patch: Partial<OpeningHoursDay>) => {
  setLocal((prev) => {
    const next: OpeningHours = {
      ...prev,
      [day]: {
        ...prev[day],
        ...patch,
      },
    };

    // notify parent AFTER state calculation but not inside the render cycle
    Promise.resolve().then(() => onChange(next));

    return next;
  });
};


  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Opening hours</div>
      <div className="rounded-md border divide-y">
        {DAYS.map((dayKey) => {
          const day = local[dayKey];
          return (
            <div
              key={dayKey}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm font-medium w-24">
                {DAY_LABELS[dayKey]}
              </div>

              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={day.closed}
                    onChange={(e) =>
                      updateDay(dayKey, { closed: e.target.checked })
                    }
                  />
                  <span>Closed</span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative w-40">
                    <input
                      type="time"
                      className="time-input w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-14 py-2 text-sm font-medium text-slate-900 disabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
                      value={day.open ?? ""}
                      onChange={(e) =>
                        updateDay(dayKey, { open: e.target.value || null })
                      }
                      disabled={day.closed}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                      {getMeridiem(day.open)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">to</span>
                  <div className="relative w-40">
                    <input
                      type="time"
                      className="time-input w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-14 py-2 text-sm font-medium text-slate-900 disabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
                      value={day.close ?? ""}
                      onChange={(e) =>
                        updateDay(dayKey, { close: e.target.value || null })
                      }
                      disabled={day.closed}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                      {getMeridiem(day.close)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        These hours will be used to show whether the branch is open/closed on
        the public menu.
      </p>
    </div>
  );
}
export { ensureOpeningHours };
