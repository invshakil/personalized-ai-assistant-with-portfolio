import { listProviderConfigs } from "@/services/ai";
import { isCryptoConfigured } from "@/services/ai/crypto";
import AiSettingsPage from "./AiSettingsPage";

export const metadata = { title: "AI Settings" };

export default async function Page() {
  const providers = await listProviderConfigs();
  return <AiSettingsPage initial={providers} cryptoReady={isCryptoConfigured()} />;
}
