import { db } from "@/lib/db";

export interface BusinessProfileData {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
}

// Used on PDFs when the singleton row hasn't been customised yet.
export const DEFAULT_BUSINESS: BusinessProfileData = {
  name: "Syful Islam Shakil",
  tagline: "Software Engineering & Consulting",
  address: "",
  phone: "",
  email: "",
};

/** Returns the business profile, or sensible defaults if it hasn't been set. */
export async function getBusinessProfile(): Promise<BusinessProfileData> {
  const row = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  if (!row) return DEFAULT_BUSINESS;
  return {
    name: row.name,
    tagline: row.tagline,
    address: row.address,
    phone: row.phone,
    email: row.email,
  };
}

export async function updateBusinessProfile(
  input: Partial<BusinessProfileData>
): Promise<BusinessProfileData> {
  const row = await db.businessProfile.upsert({
    where: { id: "singleton" },
    update: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.tagline !== undefined && { tagline: input.tagline }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
    },
    create: {
      id: "singleton",
      name: input.name ?? DEFAULT_BUSINESS.name,
      tagline: input.tagline ?? DEFAULT_BUSINESS.tagline,
      address: input.address ?? "",
      phone: input.phone ?? "",
      email: input.email ?? "",
    },
  });
  return {
    name: row.name,
    tagline: row.tagline,
    address: row.address,
    phone: row.phone,
    email: row.email,
  };
}
