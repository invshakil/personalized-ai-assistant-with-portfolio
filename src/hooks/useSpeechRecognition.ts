// Thin wrapper over the browser's Web Speech API. Free transcription, no
// server round-trip — but the API is unevenly supported (great on Chrome /
// Edge desktop, missing on iOS Safari). Returns `supported: false` everywhere
// it isn't available so callers can hide the mic UI gracefully.
import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal shape of the global SpeechRecognition constructor — we cast through
 *  `unknown` because lib.dom.d.ts doesn't ship it as standard. */
interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
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
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  onFinal,
}: SpeechRecognitionHookOptions): SpeechRecognitionHookResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MinimalSpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    setSupported(getCtor() !== null);
  }, []);

  const start = useCallback(() => {
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
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      // Only emit final segments; interim text would spam the input.
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript);
      }
    };
    rec.onerror = (e) => {
      setError(e.error ?? "Speech recognition failed.");
      setListening(false);
    };
    rec.onend = () => {
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

  return { supported, listening, error, start, stop };
}
