// src/components/TournamentReport.tsx
import BattleReportCard from "./BattleReportCard";
import { TournamentRoundView } from "../pages/Combat"; // wyeksportuj też ten komponent

export function TournamentReport({ result, viewerCharacterId }: { result: any; viewerCharacterId: number }) {
  const isChallenger = viewerCharacterId === result.metadata.challengerId;
  const youWon = result.draw ? null : (isChallenger ? result.challengerWon : result.defenderWon);

  const header = isChallenger
    ? `Wyzwałeś ${result.metadata.defenderName} na turniej magiczny!`
    : `Zostałeś wyzwany na turniej magiczny przez ${result.metadata.challengerName}!`;

  const footer = result.draw
    ? `Remis turniejowy ${result.challengerTotal}:${result.defenderTotal}`
    : youWon
      ? `Triumf w turnieju! Wynik: ${result.challengerTotal}:${result.defenderTotal}`
      : `Porażka w turnieju. Wynik: ${result.challengerTotal}:${result.defenderTotal}`;

  // klatka per runda = punkty ZDOBYTE w danej rundzie (0-5), nie suma narastająca —
  // pasek się resetuje na start każdej rundy
const frames = result.rounds.map((round: any) => ({
  leftValue: round.challengerTotalAfter,
  rightValue: round.defenderTotalAfter,
  leftRoundEffectiveness: round.challenger.effectiveness,
  rightRoundEffectiveness: round.defender.effectiveness,
}));

  return (
    <div>
      <p style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: "#A78BFA" }}>{header}</p>
      <BattleReportCard
        mode="tournament"
        left={{ name: result.metadata.challengerName, isPlayer: true, avatarIndex: result.metadata.challengerAvatarIndex }}
        right={{ name: result.metadata.defenderName, isPlayer: true, avatarIndex: result.metadata.defenderAvatarIndex, mirror: true }}
        leftMax={5}
        rightMax={5}
        frames={frames}
        frameIntervalMs={1100}
        renderTurnDetail={(i) => (
          <TournamentRoundView
            round={result.rounds[i]}
            challengerName={result.metadata.challengerName}
            defenderName={result.metadata.defenderName}
            mySide={isChallenger ? "challenger" : "defender"}
          />
        )}
      />
      <p style={{ marginTop: 10, fontWeight: 700, color: "#F5C451" }}>{footer}</p>
    </div>
  );
}