import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.");
  }

  const hash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { password: hash },
    create: { email, name: "Shakil", password: hash, role: "ADMIN" },
  });

  console.log(`✓ Admin user ensured: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
