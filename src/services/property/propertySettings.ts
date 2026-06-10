import { db } from "@/lib/db";

export async function getPropertySettings() {
  return db.propertySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

export interface UpdatePropertySettingsInput {
  propertyName?: string;
  ownerName?: string;
  ownerPhone?: string;
  address?: string;
  bankAccount?: string | null;
}

export async function updatePropertySettings(input: UpdatePropertySettingsInput) {
  return db.propertySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...input },
    update: input,
  });
}
