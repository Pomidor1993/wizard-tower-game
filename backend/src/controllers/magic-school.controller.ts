import { Request, Response } from "express";
import * as SchoolService from "../services/magic-school.service.js";
import type { BuildingType } from "../data/school-buildings.js";

export async function createSchool(req: Request, res: Response) {
  try {
    const { name, abbreviation, description } = req.body;
    const school = await SchoolService.createSchool(
      req.userId!,
      name,
      abbreviation ?? "",
      description ?? ""
    );
    res.status(201).json(school);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getMySchool(req: Request, res: Response) {
  try {
    const school = await SchoolService.getMySchool(req.userId!);
    res.json(school ?? null);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getSchool(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const school = await SchoolService.getSchoolProfile(schoolId);
    res.json(school);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function listSchools(req: Request, res: Response) {
  try {
    const search = req.query.search as string | undefined;
    const schools = await SchoolService.listSchools(search);
    res.json(schools);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function editSchool(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { description, emblem } = req.body;
    const result = await SchoolService.editSchoolProfile(req.userId!, schoolId, { description, emblem });
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function dissolveSchool(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.dissolveSchool(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function inviteMember(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { characterId } = req.body;
    const result = await SchoolService.inviteMember(req.userId!, schoolId, characterId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function kickMember(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const targetId = parseInt(req.params.characterId);
    const result = await SchoolService.kickMember(req.userId!, schoolId, targetId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function leaveSchool(req: Request, res: Response) {
  try {
    const result = await SchoolService.leaveSchool(req.userId!);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function setDeputy(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { characterId } = req.body;
    const result = await SchoolService.setDeputy(req.userId!, schoolId, characterId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function removeDeputy(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const targetId = parseInt(req.params.characterId);
    const result = await SchoolService.removeDeputy(req.userId!, schoolId, targetId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function searchCharacters(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    const results = await SchoolService.searchCharacters(query);
    res.json(results);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function upgradeBuilding(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { buildingType } = req.body;
    const result = await SchoolService.upgradeBuilding(req.userId!, schoolId, buildingType as BuildingType);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getBuildings(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.getSchoolBuildings(schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getLibrary(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.getLibrary(schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function proposeLibrarySpell(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { spellId } = req.body;
    const result = await SchoolService.proposeLibrarySpell(req.userId!, schoolId, spellId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function reviewLibrarySpell(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const entryId = parseInt(req.params.entryId);
    const { action } = req.body;
    const result = await SchoolService.reviewLibrarySpell(req.userId!, schoolId, entryId, action);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function removeLibrarySpell(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const entryId = parseInt(req.params.entryId);
    const result = await SchoolService.removeLibrarySpell(req.userId!, schoolId, entryId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function learnFromLibrary(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { spellId } = req.body;
    const result = await SchoolService.learnFromLibrary(req.userId!, schoolId, spellId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getActiveBonuses(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.getActiveBonuses(schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function setActiveBonus(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const { bonusKey, active } = req.body;
    const result = await SchoolService.setActiveBonus(req.userId!, schoolId, bonusKey, active);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function requestJoin(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.requestJoinSchool(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function reviewJoinRequest(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);
    const { action } = req.body;
    const result = await SchoolService.reviewJoinRequest(req.userId!, schoolId, requestId, action);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getJoinRequests(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.getJoinRequests(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function getMyJoinRequestStatus(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.getMyJoinRequestStatus(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}

export async function acceptInvite(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.acceptInvite(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}
export async function rejectInvite(req: Request, res: Response) {
  try {
    const schoolId = parseInt(req.params.id);
    const result = await SchoolService.rejectInvite(req.userId!, schoolId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
}