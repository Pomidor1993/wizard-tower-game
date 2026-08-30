import prisma from "../lib/prisma.js";

export type ReportType =
  | "study" | "exploration" | "duel"
  | "tournament" | "rift_unstable" | "rift_stable";

export async function createReport(
  characterId: number,
  type: ReportType,
  payload: object,
  createdAt?: Date,
): Promise<number> {
  const report = await prisma.gameReport.create({
    data: {
      characterId,
      type,
      payload: JSON.stringify(payload),
      ...(createdAt ? { createdAt } : {}),
    },
  });
  return report.id;
}

export async function getReportList(userId: number, page = 1, pageSize = 20) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const [reports, total, unread] = await Promise.all([
    prisma.gameReport.findMany({
      where: { characterId: character.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gameReport.count({ where: { characterId: character.id } }),
    prisma.gameReport.count({ where: { characterId: character.id, isRead: false } }),
  ]);

  return {
    reports: reports.map(r => ({
      id: r.id,
      type: r.type,
      isRead: r.isRead,
      createdAt: r.createdAt,
      preview: extractPreview(r.type, JSON.parse(r.payload)),
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    unreadCount: unread,
  };
}

export async function getReportById(userId: number, reportId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const report = await prisma.gameReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Raport nie znaleziony");
  if (report.characterId !== character.id) throw new Error("Brak dostępu");

  if (!report.isRead) {
    await prisma.gameReport.update({ where: { id: reportId }, data: { isRead: true } });
  }

  return {
    id: report.id,
    type: report.type,
    isRead: true,
    createdAt: report.createdAt,
    payload: JSON.parse(report.payload),
    viewerCharacterId: character.id,
  };
}

export async function markReportRead(userId: number, reportId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const report = await prisma.gameReport.findUnique({ where: { id: reportId } });
  if (!report || report.characterId !== character.id) throw new Error("Brak dostępu");

  await prisma.gameReport.update({ where: { id: reportId }, data: { isRead: true } });
}

function extractPreview(type: string, payload: any): string {
  switch (type) {
    case "study":
  return payload.subcategoryName ?? "Raport ze studiów";
    case "exploration":
  return payload.locationName ?? "Raport z eksploracji";
    case "duel": {
      const vs = `${payload.metadata?.attackerName} vs ${payload.metadata?.defenderName}`;
      const won = payload.viewerIsAttacker ? payload.attackerWon : !payload.attackerWon;
      return `${vs} — ${payload.draw ? "remis" : won ? "zwycięstwo" : "porażka"}`;
    }
    case "tournament": {
      const vs = `${payload.metadata?.challengerName} vs ${payload.metadata?.defenderName}`;
      const won = payload.viewerIsChallenger ? payload.challengerWon : payload.defenderWon;
      return `Turniej: ${vs} — ${payload.draw ? "remis" : won ? "zwycięstwo" : "porażka"}`;
    }
case "rift_unstable":
  return `Szczelina: ${payload.worldName ?? payload.worldKey} — ${payload.summary?.xpEarned ?? 0} XP`;
    case "rift_stable":
      return `Szczelina stabilna: ${payload.worldName ?? payload.worldKey} — ${payload.success ? "sukces" : "porażka"}`;
    default: return "Raport";
  }
}