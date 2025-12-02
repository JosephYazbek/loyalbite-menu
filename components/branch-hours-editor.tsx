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
                  <input
                    type="time"
                    className="w-28 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                    value={day.open ?? ""}
                    onChange={(e) =>
                      updateDay(dayKey, { open: e.target.value || null })
                    }
                    disabled={day.closed}
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    className="w-28 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                    value={day.close ?? ""}
                    onChange={(e) =>
                      updateDay(dayKey, { close: e.target.value || null })
                    }
                    disabled={day.closed}
                  />
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
