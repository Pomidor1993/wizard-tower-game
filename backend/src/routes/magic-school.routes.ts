import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as C from "../controllers/magic-school.controller.js";

const router = Router();

// Szkoły — ogólne
router.get("/",                                 requireAuth, C.listSchools);
router.post("/",                                requireAuth, C.createSchool);
router.get("/my",                               requireAuth, C.getMySchool);
router.get("/search-characters",                requireAuth, C.searchCharacters);
router.get("/:id",                              requireAuth, C.getSchool);
router.patch("/:id",                            requireAuth, C.editSchool);
router.delete("/:id",                           requireAuth, C.dissolveSchool);

// Dołączanie i zarządzanie członkami
router.post("/:id/join-request",                requireAuth, C.requestJoin);
router.post("/:id/join-request/:requestId/review", requireAuth, C.reviewJoinRequest);
router.get("/:id/join-requests",                requireAuth, C.getJoinRequests);
router.get("/:id/my-join-request",              requireAuth, C.getMyJoinRequestStatus);
router.post("/:id/accept-invite",               requireAuth, C.acceptInvite);
router.post("/:id/reject-invite",               requireAuth, C.rejectInvite);
router.post("/:id/members",                     requireAuth, C.inviteMember);
router.delete("/:id/members/:characterId",      requireAuth, C.kickMember);
router.post("/:id/leave",                       requireAuth, C.leaveSchool);
router.post("/:id/deputy",                      requireAuth, C.setDeputy);
router.delete("/:id/deputy/:characterId",       requireAuth, C.removeDeputy);

// Budynki
router.get("/:id/buildings",                    requireAuth, C.getBuildings);
router.post("/:id/buildings/upgrade",           requireAuth, C.upgradeBuilding);

// Biblioteka
router.get("/:id/library",                      requireAuth, C.getLibrary);
router.post("/:id/library/propose",             requireAuth, C.proposeLibrarySpell);
router.patch("/:id/library/:entryId/review",    requireAuth, C.reviewLibrarySpell);
router.delete("/:id/library/:entryId",          requireAuth, C.removeLibrarySpell);
router.post("/:id/library/learn",               requireAuth, C.learnFromLibrary);

// Bonusy stołówki
router.get("/:id/bonuses",                      requireAuth, C.getActiveBonuses);
router.post("/:id/bonuses",                     requireAuth, C.setActiveBonus);

export default router;