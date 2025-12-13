"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AnalyticsTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type AnalyticsTabsProps = {
  tabs: AnalyticsTab[];
  defaultValue: string;
};

export function AnalyticsTabs({ tabs, defaultValue }: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-full bg-muted p-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={tab.id === activeTab ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div className="space-y-6">{active?.content}</div>
    </div>
  );
}
