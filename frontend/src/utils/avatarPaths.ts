// src/utils/avatarPaths.ts

// ── AWATARY GRACZY ────────────────────────────────────────────────────────
const playerIconImages = import.meta.glob("../assets/playericons/*.jpg", { eager: true, as: "url" }) as Record<string, string>;

const PLAYER_ICONS: Record<number, string> = {};
for (const [path, url] of Object.entries(playerIconImages)) {
  const match = path.match(/playericon(\d+)\.jpg$/);
  if (match) {
    PLAYER_ICONS[parseInt(match[1], 10)] = url;
  }
}

export function getPlayerAvatarUrl(avatarIndex: number): string {
  return PLAYER_ICONS[avatarIndex] ?? PLAYER_ICONS[0] ?? "";
}

// ── AWATARY PVE ───────────────────────────────────────────────────────────
const pveImages = import.meta.glob("../assets/pveentities/*.jpg", { eager: true, as: "url" }) as Record<string, string>;

export function getPveAvatarUrl(imageKey: string | undefined | null): string | null {
  if (!imageKey) return null;
  const base = imageKey.replace(/\.(png|jpg|jpeg)$/i, "");
  const match = Object.entries(pveImages).find(([path]) => path.endsWith(`/${base}.jpg`));
  return match ? match[1] : null;
}