import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { TUTORIAL_STEPS } from "./tutorial/tutorial.constants.js";
import { rollDailyRandomMessage } from "./system-messages.service.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

export async function registerUser(username: string, email: string, password: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw new Error(
      existing.email === email ? "Email jest już zajęty" : "Nazwa użytkownika jest już zajęta"
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Krok 1: stwórz usera z postacią i wieżą
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
          equipment: { create: {} },
          tower: {
            create: {
              level: 1,
              buildings: {
                create: [
                  { buildingType: "power_collector", level: 0 },
                  { buildingType: "library",         level: 1 },
                  { buildingType: "chaos_vault",     level: 1 },
                ],
              },
            },
          },
        },
      },
    },
    include: { character: true }, // potrzebujemy character.id
  });

  const characterId = user.character!.id;

  // Krok 2: inicjalizuj tutorial i zadania naprawcze
  await prisma.characterTutorial.create({
    data: { characterId, step: TUTORIAL_STEPS.INTRO },
  });

  await prisma.homeRepairTask.createMany({
    data: [
      { characterId, taskCode: "FOUNDATIONS", status: "locked" },
      { characterId, taskCode: "WALLS",       status: "locked" },
      { characterId, taskCode: "FURNITURE",   status: "locked" },
    ],
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return { token, username: user.username };
}

// ── LOGOWANIE ────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { character: true } });

  if (!user) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  if (user.character) {
    try {
      await rollDailyRandomMessage(user.character.id);
    } catch (err) {
      console.error("Błąd losowania codziennej wiadomości:", err);
    }
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, username: user.username };
}