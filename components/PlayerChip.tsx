import type { ReactNode } from "react";
import {
  computeLobbyLayout,
  playerChipPalette,
  playerChipSurfaceStyle,
  sortPlayersForLobby,
  type LobbyChipLayout,
} from "@/lib/player-chip-style";

type ChipProps = {
  children: ReactNode;
  index: number;
  placement: LobbyChipLayout;
};

export function PlayerChip({ children, index, placement }: ChipProps) {
  const palette = playerChipPalette(index);

  return (
    <li
      className="fc-lobby-chip-slot"
      style={{
        left: `${placement.left}%`,
        top: `${placement.top}%`,
        animationDelay: `${index * 0.4}s`,
      }}
    >
      <span
        className="fc-player-chip"
        style={playerChipSurfaceStyle(palette, placement.rotate)}
      >
        {children}
      </span>
    </li>
  );
}

type LobbyProps = {
  players: Array<{ id: string; nickname: string }>;
  className?: string;
};

export function LobbyPlayerChips({ players, className = "" }: LobbyProps) {
  const sorted = sortPlayersForLobby(players);
  const { layout, heightRem } = computeLobbyLayout(sorted);

  return (
    <ul
      className={`fc-lobby-chips ${className}`.trim()}
      style={{ minHeight: `${heightRem}rem` }}
    >
      {sorted.map((player, index) => (
        <PlayerChip
          key={player.id}
          index={index}
          placement={layout[index]}
        >
          {player.nickname}
        </PlayerChip>
      ))}
    </ul>
  );
}
