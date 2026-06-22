"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicBookingConfig } from "@/types";

// Declare the Turnstile global the loader script attaches.
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}
interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
}

interface CreatedBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  meetUrl: string | null;
}

const WD_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIsoDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtSlot(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtFullWhen(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BookConsultation() {
  const [config, setConfig] = useState<PublicBookingConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    booking: CreatedBooking;
    cancelToken: string;
  } | null>(null);

  const turnstileTokenRef = useRef<string>("");
  const turnstileBoxRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Load config on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/booking/config", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = (await res.json()) as { data: PublicBookingConfig };
        setConfig(j.data);
        if (j.data.durationsMinutes[0]) setDuration(j.data.durationsMinutes[0]);
      } catch {
        setConfigError(true);
      }
    })();
  }, []);

  // Render Turnstile. Two-step because the box element only mounts after the
  // visitor picks a slot, but the script can be loaded earlier in parallel.
  // Re-runs when `selectedSlot` flips truthy so we render into the freshly
  // mounted div, and tears down when the form unmounts.
  useEffect(() => {
    if (!config?.turnstileSiteKey) return;
    if (!selectedSlot) return; // box only exists after slot is picked
    let cancelled = false;
    const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    const tryRender = () => {
      if (cancelled) return;
      if (!window.turnstile || !turnstileBoxRef.current) return;
      if (turnstileWidgetIdRef.current) return; // already rendered
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileBoxRef.current, {
        sitekey: config.turnstileSiteKey!,
        theme: "light",
        callback: (t) => {
          turnstileTokenRef.current = t;
        },
        "expired-callback": () => {
          turnstileTokenRef.current = "";
        },
        "error-callback": () => {
          turnstileTokenRef.current = "";
        },
      });
    };

    if (window.turnstile) {
      tryRender();
    } else if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = tryRender;
      document.head.appendChild(s);
    } else {
      const t = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(t);
          tryRender();
        }
      }, 100);
    }
    return () => {
      cancelled = true;
      const id = turnstileWidgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // ignore
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [config?.turnstileSiteKey, selectedSlot]);

  // Build the day grid (next horizonDays). Disabled days have zero slots; we
  // discover that lazily as the visitor clicks (or, in a later iteration, via
  // a bulk pre-fetch).
  const days = useMemo(() => {
    if (!config) return [];
    const out: { key: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < config.maxHorizonDays; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out.push({ key: toIsoDayKey(d), date: d });
    }
    return out;
  }, [config]);

  const loadSlots = useCallback(async (date: string, dur: number) => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/booking/slots?date=${date}&duration=${dur}`, {
        cache: "no-store",
      });
      const j = (await res.json()) as {
        data?: { starts: string[]; duration: number };
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Could not load slots");
      setSlots(j.data?.starts ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dayKey && duration) loadSlots(dayKey, duration);
  }, [dayKey, duration, loadSlots]);

  if (configError || !config) {
    return null;
  }
  if (!config.enabled) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedSlot || !duration) {
      setError("Please pick a time first.");
      return;
    }
    if (config.turnstileSiteKey && !turnstileTokenRef.current) {
      setError("Please complete the captcha.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          message: message || null,
          startsAt: selectedSlot,
          durationMin: duration,
          turnstileToken: turnstileTokenRef.current || undefined,
          website, // honeypot
        }),
      });
      const j = (await res.json()) as {
        data?: { booking: CreatedBooking; cancelToken: string };
        error?: string;
      };
      if (!res.ok || !j.data) throw new Error(j.error ?? "Booking failed");
      setConfirmed(j.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      // Reset turnstile so the visitor can retry.
      if (window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        } catch {
          // ignore
        }
      }
      turnstileTokenRef.current = "";
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappHref =
    config.whatsapp.enabled && config.whatsapp.number
      ? `https://wa.me/${config.whatsapp.number}${
          config.whatsapp.prefill ? `?text=${encodeURIComponent(config.whatsapp.prefill)}` : ""
        }`
      : null;

  return (
    <div className="sec" id="booking">
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Schedule
        </p>
        <div className="bk-layout">
          {/* Left: intro + WhatsApp shortcut */}
          <div>
            <h2 className="bk-heading" data-animate="true" data-delay="1">
              Book a quick
              <br />
              consultation.
            </h2>
            <p className="bk-sub" data-animate="true" data-delay="2">
              Pick a slot and you&apos;ll get a Google Meet invite by email. Bring an idea, a code
              question, or a problem you&apos;re stuck on — whatever fits the time.
            </p>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="bk-quick"
                data-animate="true"
                data-delay="3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.5 14.4c-.3-.2-1.7-.8-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 3 1.3 3.2c.2.3 2.2 3.3 5.3 4.6 2 .8 2.8.9 3.8.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.7-.4z" />
                  <path d="M12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.5 5.7 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0zm0 22c-1.9 0-3.7-.5-5.2-1.4l-.4-.2-3.7.9 1-3.6-.2-.4C2.5 15.8 2 13.9 2 12 2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z" />
                </svg>
                Quick chat on WhatsApp
              </a>
            )}
            <p className="bk-muted" data-animate="true" data-delay="3" style={{ marginTop: 20 }}>
              All times shown in your local timezone. Meeting host is in{" "}
              {config.timezone.replace("_", " ")}.
            </p>
          </div>

          {/* Right: booking card */}
          <div className="bk-card" data-animate="true" data-delay="2">
            {confirmed ? (
              <ConfirmedView
                booking={confirmed.booking}
                cancelToken={confirmed.cancelToken}
                onReset={() => {
                  setConfirmed(null);
                  setSelectedSlot(null);
                  setName("");
                  setEmail("");
                  setTopic("");
                  setMessage("");
                }}
              />
            ) : (
              <form onSubmit={submit} noValidate>
                {/* Duration */}
                {config.durationsMinutes.length > 1 && (
                  <div className="bk-row">
                    <span className="bk-label">Duration</span>
                    <div className="bk-chips">
                      {config.durationsMinutes.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`bk-chip${d === duration ? " bk-chip--active" : ""}`}
                          onClick={() => setDuration(d)}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day picker */}
                <div className="bk-row">
                  <span className="bk-label">Pick a day</span>
                  <div className="bk-daygrid">
                    {days.slice(0, 14).map(({ key, date }) => {
                      const isActive = dayKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`bk-day${isActive ? " bk-day--active" : ""}`}
                          onClick={() => setDayKey(key)}
                        >
                          <span className="bk-day-dow">{WD_NAMES[date.getDay()]}</span>
                          <span className="bk-day-num">{date.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slot picker */}
                {dayKey && (
                  <div className="bk-row">
                    <span className="bk-label">Pick a time</span>
                    {slotsLoading ? (
                      <span className="bk-muted">Loading…</span>
                    ) : slots.length === 0 ? (
                      <span className="bk-muted">No openings on this day — try another.</span>
                    ) : (
                      <div className="bk-chips">
                        {slots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`bk-chip${s === selectedSlot ? " bk-chip--active" : ""}`}
                            onClick={() => setSelectedSlot(s)}
                          >
                            {fmtSlot(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Visitor fields */}
                {selectedSlot && (
                  <>
                    <div className="bk-row">
                      <label className="bk-label" htmlFor="bk-name">
                        Your name
                      </label>
                      <input
                        id="bk-name"
                        className="bk-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={80}
                      />
                    </div>
                    <div className="bk-row">
                      <label className="bk-label" htmlFor="bk-email">
                        Email
                      </label>
                      <input
                        id="bk-email"
                        type="email"
                        className="bk-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={120}
                      />
                    </div>
                    <div className="bk-row">
                      <label className="bk-label" htmlFor="bk-topic">
                        Topic
                      </label>
                      <input
                        id="bk-topic"
                        className="bk-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What do you want to talk about?"
                        required
                        maxLength={120}
                      />
                    </div>
                    <div className="bk-row">
                      <label className="bk-label" htmlFor="bk-message">
                        Anything else? (optional)
                      </label>
                      <textarea
                        id="bk-message"
                        className="bk-textarea"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={1000}
                      />
                    </div>

                    {/* Honeypot — humans never see this */}
                    <div className="bk-honeypot" aria-hidden="true">
                      <label>
                        Website
                        <input
                          tabIndex={-1}
                          autoComplete="off"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </label>
                    </div>

                    {config.turnstileSiteKey && (
                      <div ref={turnstileBoxRef} style={{ margin: "8px 0 14px" }} />
                    )}

                    <button type="submit" className="bk-btn" disabled={submitting}>
                      {submitting ? "Booking…" : `Confirm — ${fmtSlot(selectedSlot)}`}
                    </button>

                    {error && <div className="bk-error">{error}</div>}
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmedView({
  booking,
  cancelToken,
  onReset,
}: {
  booking: CreatedBooking;
  cancelToken: string;
  onReset: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cancelToken }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Cancel failed");
      }
      setCancelled(true);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  if (cancelled) {
    return (
      <div className="bk-success">
        <div className="bk-success-title">Booking cancelled.</div>
        <div className="bk-success-row">A cancellation email has been sent.</div>
        <button
          type="button"
          className="bk-btn-outline"
          onClick={onReset}
          style={{ marginTop: 16 }}
        >
          Book another time
        </button>
      </div>
    );
  }

  return (
    <div className="bk-success">
      <div className="bk-success-title">You&apos;re booked.</div>
      <div className="bk-success-row">
        <strong>{fmtFullWhen(booking.startsAt)}</strong> · {booking.durationMin} min
      </div>
      <div className="bk-success-row">
        A calendar invite is on its way. Open the Meet link a minute before:
      </div>
      {booking.meetUrl && (
        <a
          className="bk-success-meet"
          href={booking.meetUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {booking.meetUrl}
        </a>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button type="button" className="bk-btn-outline" onClick={cancel} disabled={cancelling}>
          {cancelling ? "Cancelling…" : "Cancel"}
        </button>
        <button type="button" className="bk-btn-outline" onClick={onReset}>
          Book another time
        </button>
      </div>
      {cancelError && <div className="bk-error">{cancelError}</div>}
    </div>
  );
}
