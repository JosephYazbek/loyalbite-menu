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
    | "menu_print_view"
    | "menu_search"
    | "menu_filter"
    | "menu_favorite"
    | "menu_unfavorite"
    | "menu_cached_load"
    | "item_modal_open"
    | "item_modal_close"
    | "item_featured_view"
    | "modifier_group_open"
    | "modifier_option_select"
    | "modifier_option_remove"
    | "filter_toggle"
    | "allergen_filter_apply"
    | "favorites_filter_apply"
    | "featured_filter_apply";
  language?: "en" | "ar";
  metadata?: Record<string, unknown>;
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
export const getAnalyticsSessionId = getSessionId;

const getDeviceType = () => {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent || "";
  const isMobileUa = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);
  if (isMobileUa) return "mobile";

  // Fallback to viewport width for unknown agents (e.g., some tablets)
  return window.innerWidth <= 900 ? "mobile" : "desktop";
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
        metadata: payload.metadata ?? null,
      }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] failed to log event", error);
    }
  }
}
