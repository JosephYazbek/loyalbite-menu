"use client";

export type AnalyticsEventPayload = {
  restaurantId: string;
  branchId?: string;
  categoryId?: string;
  itemId?: string;
  eventType:
    | "menu_view"
    | "category_view"
    | "item_view"
    | "whatsapp_click"
    | "microsite_view"
    | "microsite_to_menu_click"
    | "menu_print_view";
  language?: "en" | "ar";
};

const SESSION_KEY = "lb_session_id";

const EVENT_ENDPOINT = "/api/events/log";

const getSessionId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return null;
  }
};

const getDeviceType = () => {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth <= 1024 ? "mobile" : "desktop";
};

export async function logAnalyticsEvent(
  payload: AnalyticsEventPayload
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (!payload.branchId) {
      return;
    }
    const sessionId = getSessionId();
    const deviceType = getDeviceType();

    await fetch(EVENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurantId: payload.restaurantId,
        branchId: payload.branchId,
        categoryId: payload.categoryId,
        itemId: payload.itemId,
        eventType: payload.eventType,
        language: payload.language,
        deviceType,
        sessionId,
      }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] failed to log event", error);
    }
  }
}
