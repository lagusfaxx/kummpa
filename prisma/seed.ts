import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@kumpa.app";

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: "replace-with-real-hash-in-phase-2",
      role: UserRole.ADMIN,
      firstName: "Kumpa",
      lastName: "Admin"
    },
    update: {}
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
