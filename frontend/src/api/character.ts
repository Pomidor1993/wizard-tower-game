import api from "./client";

export async function getMyCharacter() {
  const res = await api.get("/character/me");
  return res.data;
}

export async function getUpgradeCosts() {
  const res = await api.get("/character/upgrade-costs");
  return res.data;
}

export async function upgradeStat(stat: string) {
  const res = await api.post("/character/upgrade", { stat });
  return res.data;
}