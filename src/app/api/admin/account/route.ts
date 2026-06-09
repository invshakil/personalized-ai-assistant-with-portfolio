import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = session.user.id;

  // Name update
  if ("name" in body) {
    const { name } = body as { name: string };
    if (!name?.trim()) {
      return Response.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    const user = await db.user.update({ where: { id: userId }, data: { name: name.trim() } });
    return Response.json({ data: { name: user.name } });
  }

  // Password update
  if ("currentPassword" in body && "newPassword" in body) {
    const { currentPassword, newPassword } = body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.password) {
      return Response.json({ error: "No password set on this account" }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: userId }, data: { password: hash } });

    return Response.json({ data: { message: "Password updated" } });
  }

  return Response.json({ error: "Nothing to update" }, { status: 400 });
}
