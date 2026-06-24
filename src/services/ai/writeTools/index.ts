// Write-tool registry for the AI assistant. Tool definitions live in the domain
// files (property.ts, finance.ts); this module tags them by domain, assembles
// the registry, and exposes the lookup/preview/commit entry points used by the
// chat route, the tool catalog, and the execute endpoint.
//
// See ./shared.ts for the two-phase (preview-in-stream / commit-on-approval)
// contract every tool follows.
import type { AiToolDef, CommitResult } from "../types";
import type { Raw, WriteToolDef } from "./shared";
import { propertyTools } from "./property";
import { financeTools } from "./finance";
import { moneyTools } from "./money";
import { solarTools } from "./solar";

export type { WriteToolDef } from "./shared";

export const WRITE_TOOLS: WriteToolDef[] = [
  ...propertyTools.map((t): WriteToolDef => ({ ...t, domain: "property" })),
  ...financeTools.map((t): WriteToolDef => ({ ...t, domain: "finance" })),
  ...moneyTools.map((t): WriteToolDef => ({ ...t, domain: "money" })),
  ...solarTools.map((t): WriteToolDef => ({ ...t, domain: "solar" })),
];

const byName = new Map(WRITE_TOOLS.map((t) => [t.name, t]));

export const isWriteTool = (name: string): boolean => byName.has(name);

/** Tool defs (name/description/parameters/kind/domain) for the model catalog. */
export const writeToolDefs: AiToolDef[] = WRITE_TOOLS.map(
  ({ name, description, parameters, kind, domain }) => ({
    name,
    description,
    parameters,
    kind,
    domain,
  })
);

/** Validate + describe a proposed write WITHOUT performing it (runs in-stream). */
export async function previewWrite(name: string, input: unknown): Promise<{ summary: string }> {
  const tool = byName.get(name);
  if (!tool) throw new Error(`Unknown write tool: ${name}`);
  const summary = await tool.preview((input ?? {}) as Raw);
  return { summary };
}

/** Perform an approved write. Re-validates the same untrusted input. */
export async function commitWrite(name: string, input: unknown): Promise<CommitResult> {
  const tool = byName.get(name);
  if (!tool) throw new Error(`Unknown write tool: ${name}`);
  return tool.commit((input ?? {}) as Raw);
}
