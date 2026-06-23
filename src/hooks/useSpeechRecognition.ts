// Thin wrapper over the browser's Web Speech API. Free transcription, no
// server round-trip — but the API is unevenly supported (great on Chrome /
// Edge desktop, missing on iOS Safari). Returns `supported: false` everywhere
// it isn't available so callers can hide the mic UI gracefully.
import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal shape of the global SpeechRecognition constructor — we cast through
 *  `unknown` because lib.dom.d.ts doesn't ship it as standard. */
interface SpeechResultItem {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  /** Index of the first result in `results` that's new for this event.
   *  With continuous: true, each event re-delivers all prior results too;
   *  iterating from resultIndex avoids re-emitting them. */
  resultIndex: number;
  results: ArrayLike<SpeechResultItem>;
}

interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

type SRCtor = new () => MinimalSpeechRecognition;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionHookOptions {
  /** Called with each *final* transcript segment as the user speaks. */
  onFinal: (text: string) => void;
}

export interface SpeechRecognitionHookResult {
  /** Web Speech API is present in this browser. */
  supported: boolean;
  /** Currently capturing audio. */
  listening: boolean;
  /** Last error string from the recogniser, if any (e.g. "no-speech", "not-allowed"). */
  error: string | null;
  /** Site-level microphone permission, when the browser supports the Permissions API.
   *  Lets the UI show a "previously denied" recovery dialog instead of silently failing. */
  permissionState: "granted" | "prompt" | "denied" | "unknown";
  start: () => Promise<void>;
  stop: () => void;
  /** Manual refresh — call after the user resets the permission via the browser UI. */
  refreshPermission: () => Promise<void>;
}

export function useSpeechRecognition({
  onFinal,
}: SpeechRecognitionHookOptions): SpeechRecognitionHookResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    "granted" | "prompt" | "denied" | "unknown"
  >("unknown");
  const recRef = useRef<MinimalSpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const refreshPermission = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.permissions ||
      typeof navigator.permissions.query !== "function"
    ) {
      setPermissionState("unknown");
      return;
    }
    try {
      // The Permissions API spec lists "microphone" but TS lib types only
      // include a narrower union; cast through unknown.
      const status = (await navigator.permissions.query({
        name: "microphone",
      } as unknown as PermissionDescriptor)) as PermissionStatus & {
        state: "granted" | "prompt" | "denied";
      };
      setPermissionState(status.state);
      // React to live changes (e.g. user resets via the lock icon).
      status.onchange = () => {
        setPermissionState(status.state);
        if (status.state !== "denied") setError(null);
      };
    } catch {
      setPermissionState("unknown");
    }
  }, []);

  useEffect(() => {
    setSupported(getCtor() !== null);
    refreshPermission();
  }, [refreshPermission]);

  const start = useCallback(async () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }

    // Chrome's SpeechRecognition API does NOT trigger the mic permission
    // prompt on its own — it just rejects with "not-allowed" when permission
    // isn't already granted. Force the prompt via getUserMedia first, then
    // close the stream and hand off to SpeechRecognition.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We only needed the prompt — close the tracks so the mic indicator
        // doesn't stay on twice.
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        const name = (e as { name?: string } | undefined)?.name ?? "";
        const friendly =
          name === "NotAllowedError" || name === "SecurityError"
            ? "Microphone access is blocked. Click the lock icon in the address bar → reset Microphone, or check macOS System Settings → Privacy & Security → Microphone for your browser."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No microphone found on this device."
              : `Could not access microphone (${name || "unknown"}).`;
        console.warn("[speech] getUserMedia failed:", name, e);
        setError(friendly);
        setListening(false);
        return;
      }
    }

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart = () => {
      // The "start" event fires after the OS mic actually opens — at this
      // point the browser has granted permission and audio is flowing.
      // Useful in the console when debugging "nothing happened" reports.
      console.info("[speech] recognition started");
    };
    rec.onresult = (e) => {
      // With continuous: true each event re-delivers every prior result, so
      // iterate from resultIndex to avoid re-emitting old finals.
      const from = typeof e.resultIndex === "number" ? e.resultIndex : 0;
      for (let i = from; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript;
          console.info("[speech] final:", text);
          onFinalRef.current(text);
        }
      }
    };
    rec.onerror = (e) => {
      // Map known error codes to readable messages — e.g. "not-allowed" is
      // by far the most common cause ("denied or never granted") and the raw
      // code is unhelpful on its own.
      const code = e.error ?? "unknown";
      const friendly =
        code === "not-allowed" || code === "service-not-allowed"
          ? "Microphone permission denied. Allow it in the browser, then try again."
          : code === "no-speech"
            ? "Didn't hear anything — try again."
            : code === "audio-capture"
              ? "No microphone found on this device."
              : code === "network"
                ? "Speech recognition needs an internet connection."
                : `Speech recognition failed (${code}).`;
      console.warn("[speech] error:", code, e.message ?? "");
      setError(friendly);
      setListening(false);
    };
    rec.onend = () => {
      console.info("[speech] recognition ended");
      setListening(false);
      recRef.current = null;
    };
    setError(null);
    setListening(true);
    recRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      // Calling start() while a previous session is still finalizing throws —
      // surface as a generic error and reset.
      setError(e instanceof Error ? e.message : "Could not start microphone.");
      setListening(false);
      recRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { supported, listening, error, permissionState, start, stop, refreshPermission };
}
