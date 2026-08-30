// src/components/DuelReport.tsx
import BattleReportCard from "./BattleReportCard";
import { TurnLogView, ColorLegend } from "../pages/Combat"; // wyeksportuj te dwa z CombatPanel.tsx

export function DuelReport({ result, viewerCharacterId }: { result: any; viewerCharacterId: number }) {
  const isAttacker = viewerCharacterId === result.metadata.attackerId;
  const youWon = result.draw ? null : (isAttacker ? result.attackerWon : !result.attackerWon);

  const header = isAttacker
    ? `Wyzwałeś ${result.metadata.defenderName} na pojedynek!`
    : `Zostałeś wyzwany na pojedynek przez ${result.metadata.attackerName}!`;

  const footer = result.draw
    ? "Walka zakończona remisem"
    : youWon ? "Walka zakończona zwycięstwem" : "Walka zakończona porażką";

  const frames = result.log.map((turn: any) => ({
    leftValue: turn.sideAFighterHps.reduce((s: number, f: any) => s + f.hp, 0),
    rightValue: turn.sideBFighterHps.reduce((s: number, f: any) => s + f.hp, 0),
  }));

  return (
    <div>
      <p style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: "#F5C451" }}>{header}</p>
      <BattleReportCard
        mode="hp"
        left={{ name: result.metadata.attackerName, isPlayer: true, avatarIndex: result.metadata.attackerAvatarIndex }}
        right={{ name: result.metadata.defenderName, isPlayer: true, avatarIndex: result.metadata.defenderAvatarIndex, mirror: true }}
        leftMax={result.metadata.sideAFighterMaxHp}
        rightMax={result.metadata.sideBFighterMaxHp}
        frames={frames}
        renderTurnDetail={(i) => (
          <>
            <ColorLegend />
            <TurnLogView turn={result.log[i]} metadata={result.metadata} myCharacterId={viewerCharacterId} isFreshResult />
          </>
        )}
      />
      <p style={{ marginTop: 10, fontWeight: 700 }}>{footer}</p>
    </div>
  );
}