// Barrel for shared TypeScript types. Types live in per-module files; import
// from "@/types" and they all resolve here. When adding a type, put it in the
// matching module file (or a new one) and add its re-export below.

// Augment next-auth's Session with our custom fields. Kept in the barrel so the
// augmentation is always part of the program whenever @/types is imported.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

export * from "./property";
export * from "./finance";
export * from "./admin";
export * from "./portfolio";
