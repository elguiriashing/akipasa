"use client";

import type {
  BehaviourEntityType,
  BehaviourEvent,
  BehaviourEventType,
} from "./schema";

const endpoint = "/api/v1/behaviour/events";
const storageKey = "akipasa:behaviour-queue:v1";
const maxQueueSize = 100;
let queue: BehaviourEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let hydrated = false;

export type TrackBehaviourInput = {
  eventType: BehaviourEventType;
  surface: string;
  entityType?: BehaviourEntityType;
  entityId?: string;
  position?: number;
  recommendationRequestId?: string;
  context?: BehaviourEvent["context"];
  metadata?: BehaviourEvent["metadata"];
};

function consentGranted() {
  return (
    typeof document !== "undefined" &&
    document.cookie
      .split("; ")
      .some((item) => item === "ak_personalisation=granted")
  );
}

function hydrateQueue() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(parsed)) queue = parsed.slice(-maxQueueSize);
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function persistQueue() {
  if (typeof window === "undefined") return;
  try {
    if (queue.length) localStorage.setItem(storageKey, JSON.stringify(queue));
    else localStorage.removeItem(storageKey);
  } catch {
    // Tracking is deliberately non-blocking when storage is unavailable.
  }
}

export function trackBehaviour(input: TrackBehaviourInput) {
  if (!consentGranted() || typeof crypto === "undefined") return;
  hydrateQueue();
  queue.push({
    event_id: crypto.randomUUID(),
    schema_version: 1,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    occurred_at: new Date().toISOString(),
    surface: input.surface,
    position: input.position,
    recommendation_request_id: input.recommendationRequestId,
    context: input.context,
    metadata: input.metadata,
  });
  queue = queue.slice(-maxQueueSize);
  persistQueue();
  if (queue.length >= 10) void flushBehaviour();
  else {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void flushBehaviour(), 1000);
  }
}

export async function flushBehaviour(useBeacon = false) {
  hydrateQueue();
  if (!consentGranted() || !queue.length) return;
  const batch = queue.slice(0, 25);
  const body = JSON.stringify({ events: batch });
  if (useBeacon && navigator.sendBeacon) {
    const accepted = navigator.sendBeacon(
      endpoint,
      new Blob([body], { type: "application/json" }),
    );
    if (accepted) {
      queue.splice(0, batch.length);
      persistQueue();
    }
    return;
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
    if (!response.ok) return;
    queue.splice(0, batch.length);
    persistQueue();
    if (queue.length) void flushBehaviour();
  } catch {
    // Offline events remain bounded in local storage and retry later.
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushBehaviour());
  window.addEventListener("pagehide", () => void flushBehaviour(true));
}
