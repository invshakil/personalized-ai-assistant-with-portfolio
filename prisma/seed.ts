import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("isshakil32!", 12);

  await db.user.upsert({
    where: { email: "inverse.shakil@gmail.com" },
    update: { password: hash },
    create: {
      email: "inverse.shakil@gmail.com",
      name: "Shakil",
      password: hash,
      role: "ADMIN",
    },
  });

  console.log("Admin user seeded: inverse.shakil@gmail.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
