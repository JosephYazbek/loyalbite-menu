"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const ranges = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type RangeSelectorProps = {
  value: "7d" | "30d" | "all";
};

export function RangeSelector({ value }: RangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (nextValue: "7d" | "30d" | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextValue);
    const query = params.toString();
    router.replace(`/admin/analytics${query ? `?${query}` : ""}`);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1">
      {ranges.map((range) => (
        <Button
          key={range.value}
          type="button"
          size="sm"
          variant={range.value === value ? "default" : "ghost"}
          className={
            range.value === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }
          onClick={() => handleSelect(range.value as "7d" | "30d" | "all")}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
