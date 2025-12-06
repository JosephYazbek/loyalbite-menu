import { ThemeSettingsPanel } from "./theme-settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Preferences
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Tune how LoyalBite looks and feels for every member of your team.
        </p>
      </div>

      <ThemeSettingsPanel />
    </div>
  );
}
