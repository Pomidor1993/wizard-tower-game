import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

// ── REJESTRACJA ──────────────────────────────────────
export async function registerUser(
  username: string,
  email: string,
  password: string
) {
  // Sprawdź czy użytkownik już istnieje
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    throw new Error(
      existing.email === email
        ? "Email jest już zajęty"
        : "Nazwa użytkownika jest już zajęta"
    );
  }

  // Zaszyfruj hasło
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Stwórz użytkownika + postać + wieżę w jednej transakcji
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
character: {
  create: {
    name: username,
    studyActions: 30,
    explorationActions: 15,
    powerShards: 1,
    equipment: {
      create: {}
    },
    tower: {
      create: {
        level: 1,
        buildings: {
          create: [
            { buildingType: "power_collector", level: 0 },
            { buildingType: "library", level: 0 },
            { buildingType: "wardrobe", level: 0 },
          ],
        },
      },
    },
  },
},
    },
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, username: user.username };
}

// ── LOGOWANIE ────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, username: user.username };
}