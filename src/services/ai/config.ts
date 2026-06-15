// AiProviderConfig service: the catalog of providers, the masked list for the
// settings UI, and upsert/activate/test. API keys are encrypted on the way in
// and never returned. Routes delegate here; AI tools never touch this.
import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret, isCryptoConfigured } from "./crypto";
import type { AiProviderId, ProviderConfigView, ProviderTestResult } from "./types";

interface CatalogEntry {
  provider: AiProviderId;
  label: string;
  defaultModel: string;
  models: string[];
  /** Whether an adapter is implemented yet (only "anthropic" today). */
  supported: boolean;
}

// Current model IDs (Jan 2026). `claude-sonnet-4-20250514` is intentionally
// absent — it is deprecated and retires 2026-06-15.
export const PROVIDER_CATALOG: CatalogEntry[] = [
  {
    provider: "anthropic",
    label: "Claude (Anthropic)",
    defaultModel: "claude-sonnet-4-6",
    models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
    supported: true,
  },
  {
    provider: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
    supported: false,
  },
  {
    provider: "google",
    label: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
    supported: false,
  },
];

function entryFor(provider: string): CatalogEntry {
  const entry = PROVIDER_CATALOG.find((e) => e.provider === provider);
  if (!entry) throw new Error(`Unknown provider: ${provider}`);
  return entry;
}

/** Idempotently ensure one row per catalog provider exists (anthropic active). */
async function ensureProviderRows() {
  for (const entry of PROVIDER_CATALOG) {
    // Bootstrap the Claude key from the legacy ANTHROPIC_API_KEY env on first
    // creation, so existing installs keep working without re-entering it.
    const bootstrap =
      entry.provider === "anthropic" && process.env.ANTHROPIC_API_KEY && isCryptoConfigured()
        ? encryptSecret(process.env.ANTHROPIC_API_KEY)
        : null;

    await db.aiProviderConfig.upsert({
      where: { provider: entry.provider },
      update: {},
      create: {
        provider: entry.provider,
        label: entry.label,
        defaultModel: entry.defaultModel,
        isActive: entry.provider === "anthropic",
        enabled: true,
        ...(bootstrap
          ? { apiKeyEnc: bootstrap.enc, apiKeyIv: bootstrap.iv, apiKeyTag: bootstrap.tag }
          : {}),
      },
    });
  }
}

/** Masked provider list for the settings UI — never includes the key. */
export async function listProviderConfigs(): Promise<ProviderConfigView[]> {
  await ensureProviderRows();
  const rows = await db.aiProviderConfig.findMany();
  return PROVIDER_CATALOG.map((entry) => {
    const row = rows.find((r) => r.provider === entry.provider)!;
    return {
      provider: entry.provider,
      label: entry.label,
      defaultModel: row.defaultModel,
      models: entry.models,
      isActive: row.isActive,
      enabled: row.enabled,
      hasKey: !!row.apiKeyEnc,
      baseUrl: row.baseUrl,
      supported: entry.supported,
    };
  });
}

/** The active, enabled provider row (with encrypted key) — used by the registry. */
export async function getActiveProviderConfig() {
  await ensureProviderRows();
  return db.aiProviderConfig.findFirst({ where: { isActive: true, enabled: true } });
}

export interface ProviderConfigUpdate {
  provider: AiProviderId;
  defaultModel?: string;
  /** undefined = leave unchanged; "" or null = clear; string = set+encrypt. */
  apiKey?: string | null;
  baseUrl?: string | null;
  enabled?: boolean;
  setActive?: boolean;
}

export async function upsertProviderConfig(input: ProviderConfigUpdate): Promise<ProviderConfigView[]> {
  const entry = entryFor(input.provider);
  await ensureProviderRows();

  const data: Prisma.AiProviderConfigUpdateInput = {};
  if (input.defaultModel !== undefined) {
    if (!entry.models.includes(input.defaultModel)) {
      throw new Error(`"${input.defaultModel}" is not a valid model for ${entry.label}.`);
    }
    data.defaultModel = input.defaultModel;
  }
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl?.trim() || null;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.apiKey !== undefined) {
    if (!input.apiKey) {
      data.apiKeyEnc = null;
      data.apiKeyIv = null;
      data.apiKeyTag = null;
    } else {
      const s = encryptSecret(input.apiKey.trim());
      data.apiKeyEnc = s.enc;
      data.apiKeyIv = s.iv;
      data.apiKeyTag = s.tag;
    }
  }

  const updated = await db.aiProviderConfig.update({ where: { provider: input.provider }, data });

  if (input.setActive) {
    if (!entry.supported) throw new Error(`${entry.label} is not supported yet.`);
    if (!updated.apiKeyEnc) throw new Error(`Add an API key for ${entry.label} before making it active.`);
    await db.$transaction([
      db.aiProviderConfig.updateMany({ where: {}, data: { isActive: false } }),
      db.aiProviderConfig.update({ where: { provider: input.provider }, data: { isActive: true } }),
    ]);
  }

  return listProviderConfigs();
}

/** Validate the stored key for a provider with a cheap live call. */
export async function testProviderConnection(provider: AiProviderId): Promise<ProviderTestResult> {
  const entry = entryFor(provider);
  if (!entry.supported) throw new Error(`${entry.label} is not supported yet.`);
  const row = await db.aiProviderConfig.findUnique({ where: { provider } });
  if (!row?.apiKeyEnc || !row.apiKeyIv || !row.apiKeyTag) {
    throw new Error(`No API key set for ${entry.label}.`);
  }
  const apiKey = decryptSecret({ enc: row.apiKeyEnc, iv: row.apiKeyIv, tag: row.apiKeyTag });

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey, baseURL: row.baseUrl ?? undefined });
    await client.messages.create({
      model: row.defaultModel,
      max_tokens: 4,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, model: row.defaultModel };
  }
  throw new Error(`Testing ${entry.label} is not supported yet.`);
}
