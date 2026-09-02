import type { DefaultMode } from "@/lib/formDefaults/registry";

/** A stored default, as returned to the client. */
export interface FormDefaultRow {
  scope: string;
  field: string;
  value: string;
  mode: DefaultMode;
}

/** Payload for setting (or clearing) one default. */
export interface FormDefaultInput {
  scope: string;
  field: string;
  /** "" clears the default without deleting the row's mode. */
  value: string;
  /** Omit to keep the current mode (or the registry's starting mode). */
  mode?: DefaultMode;
}
