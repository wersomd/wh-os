import { PrismaClient, TransactionType, AccountType, CategoryKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FINANCE_CATEGORY_PRESETS } from "../src/features/finances/constants";

const db = new PrismaClient();

async function main() {
  for (const category of FINANCE_CATEGORY_PRESETS) {
    await db.category.upsert({
      where: {
        name_type: { name: category.name, type: category.type as TransactionType },
      },
      update: {
        group: category.group,
        icon: category.icon,
        color: category.color,
        kind: CategoryKind.PRESET,
      },
      create: {
        name: category.name,
        type: category.type as TransactionType,
        group: category.group,
        icon: category.icon,
        color: category.color,
        kind: CategoryKind.PRESET,
      },
    });
  }

  if ((await db.account.count()) === 0) {
    await db.account.create({
      data: { name: "Main", type: AccountType.CARD, currency: "KZT" },
    });
  }

  // Single-user account (credentials from env; password is hashed, never stored plain).
  const email = process.env.APP_USER_EMAIL;
  const password = process.env.APP_USER_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash },
    });
    console.log(`User ready: ${email}`);
  } else {
    console.warn("APP_USER_EMAIL / APP_USER_PASSWORD not set — skipped user seed.");
  }

  console.log("Seed complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
