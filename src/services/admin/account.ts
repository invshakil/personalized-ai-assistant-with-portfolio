import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Service functions return `{ error }` for business-rule failures so the route
// can map them to a 400; they throw only on unexpected errors.

export async function updateDisplayName(
  userId: string,
  name: string
): Promise<{ error?: string; name?: string | null }> {
  if (!name?.trim()) return { error: "Name cannot be empty" };
  const user = await db.user.update({ where: { id: userId }, data: { name: name.trim() } });
  return { name: user.name };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; message?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.password) return { error: "No password set on this account" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hash } });
  return { message: "Password updated" };
}
