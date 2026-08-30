import { Request, Response } from "express";
import * as ReportService from "../services/report.service.js";

export async function listReports(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    res.json(await ReportService.getReportList(req.userId!, page, pageSize));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getReport(req: Request, res: Response) {
  try {
    const reportId = parseInt(req.params.reportId);
    if (isNaN(reportId)) { res.status(400).json({ error: "Nieprawidłowe ID" }); return; }
    res.json(await ReportService.getReportById(req.userId!, reportId));
  } catch (e: any) {
    res.status(e.message === "Brak dostępu" ? 403 : 400).json({ error: e.message });
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const reportId = parseInt(req.params.reportId);
    if (isNaN(reportId)) { res.status(400).json({ error: "Nieprawidłowe ID" }); return; }
    await ReportService.markReportRead(req.userId!, reportId);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}