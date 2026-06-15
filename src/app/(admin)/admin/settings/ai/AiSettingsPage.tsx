"use client";

import { useState } from "react";
import { Box, Alert, Stack } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import type { ProviderConfigView } from "@/services/ai/types";
import ProviderCard from "./ProviderCard";
import BudgetCard from "./BudgetCard";

interface AiSettingsPageProps {
  initial: ProviderConfigView[];
  cryptoReady: boolean;
}

export default function AiSettingsPage({ initial, cryptoReady }: AiSettingsPageProps) {
  const [providers, setProviders] = useState<ProviderConfigView[]>(initial);

  const activeLabel = providers.find((p) => p.isActive && p.enabled)?.label;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <PageHeader
        title="AI Settings"
        subtitle="Choose which AI provider powers the assistant and manage its API key."
      />

      {!cryptoReady && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          <code>AI_CONFIG_SECRET</code> is not set, so API keys can&apos;t be encrypted or saved.
          Add a 32-byte base64 secret (<code>openssl rand -base64 32</code>) to{" "}
          <code>.env.local</code> and restart.
        </Alert>
      )}

      <Alert severity={activeLabel ? "info" : "warning"} sx={{ mb: 2.5 }}>
        {activeLabel
          ? `The assistant is currently using ${activeLabel}.`
          : "No provider is active yet — add a key and set one as active to enable the assistant."}
      </Alert>

      <Stack spacing={2.5}>
        <BudgetCard />
        {providers.map((p) => (
          <ProviderCard
            key={p.provider}
            provider={p}
            cryptoReady={cryptoReady}
            onUpdated={setProviders}
          />
        ))}
      </Stack>
    </Box>
  );
}
