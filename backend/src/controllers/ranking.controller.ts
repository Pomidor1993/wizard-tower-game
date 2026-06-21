import { Request, Response } from "express";
import { getRanking, RankingCategory } from "../services/ranking.service.js";

const VALID_CATEGORIES: RankingCategory[] = [
  "level",
  "prestige",
  "builders",
  "warriors",
  "showoffs",
  "collectors",
];

export async function getRankingEndpoint(req: Request, res: Response) {
  const { category } = req.params;

  if (!category || !VALID_CATEGORIES.includes(category as RankingCategory)) {
    res.status(400).json({
      error: `Nieznana kategoria rankingu. Dostępne: ${VALID_CATEGORIES.join(", ")}`,
    });
    return;
  }

  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

  try {
    const result = await getRanking(req.userId!, category as RankingCategory, page, pageSize);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}