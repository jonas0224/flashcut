export type PlayerChipPalette = {
  bg: string;
  highlight: string;
  deep: string;
  glow: string;
};

export type LobbyChipLayout = {
  left: number;
  top: number;
  rotate: number;
};

type LobbyPlayer = { id: string; nickname: string };
type ScatterSpot = { left: number; top: number };

/** Approximate inner lobby width (host panel content area). */
const LOBBY_CONTAINER_WIDTH_REM = 40;
const CHIP_HEIGHT_REM = 3.35;
const CHIP_MIN_WIDTH_REM = 3.6;
const CHIP_MAX_WIDTH_REM = 13;
const CHIP_HORIZONTAL_PADDING_REM = 3.2;
const CHIP_CHAR_WIDTH_REM = 0.58;
const CHIP_GAP_PERCENT = 2.5;
const ROTATION_PADDING = 1.1;

/** One distinct hue per expected lobby size (up to MAX_PLAYERS with wrap). */
export const PLAYER_CHIP_PALETTES: PlayerChipPalette[] = [
  { bg: "#1368ce", highlight: "#4f9cff", deep: "#0c4a8f", glow: "rgba(79, 156, 255, 0.45)" },
  { bg: "#7c3aed", highlight: "#a78bfa", deep: "#5b21b6", glow: "rgba(167, 139, 250, 0.45)" },
  { bg: "#0d9488", highlight: "#5eead4", deep: "#0f766e", glow: "rgba(94, 234, 212, 0.4)" },
  { bg: "#db2777", highlight: "#f9a8d4", deep: "#9d174d", glow: "rgba(249, 168, 212, 0.45)" },
  { bg: "#ea580c", highlight: "#fdba74", deep: "#c2410c", glow: "rgba(253, 186, 116, 0.45)" },
  { bg: "#16a34a", highlight: "#86efac", deep: "#15803d", glow: "rgba(134, 239, 172, 0.4)" },
  { bg: "#0891b2", highlight: "#67e8f9", deep: "#0e7490", glow: "rgba(103, 232, 249, 0.4)" },
  { bg: "#ca8a04", highlight: "#fde047", deep: "#a16207", glow: "rgba(253, 224, 71, 0.4)" },
  { bg: "#dc2626", highlight: "#fca5a5", deep: "#991b1b", glow: "rgba(252, 165, 165, 0.4)" },
  { bg: "#4f46e5", highlight: "#a5b4fc", deep: "#3730a3", glow: "rgba(165, 180, 252, 0.45)" },
  { bg: "#c026d3", highlight: "#f0abfc", deep: "#86198f", glow: "rgba(240, 171, 252, 0.45)" },
  { bg: "#65a30d", highlight: "#bef264", deep: "#4d7c0f", glow: "rgba(190, 242, 100, 0.4)" },
  { bg: "#0284c7", highlight: "#7dd3fc", deep: "#0369a1", glow: "rgba(125, 211, 252, 0.4)" },
  { bg: "#9333ea", highlight: "#d8b4fe", deep: "#6b21a8", glow: "rgba(216, 180, 254, 0.45)" },
  { bg: "#e11d48", highlight: "#fda4af", deep: "#9f1239", glow: "rgba(253, 164, 175, 0.45)" },
];

const layoutCache = new Map<string, { layout: LobbyChipLayout[]; heightRem: number }>();

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chipWidthRem(nickname: string): number {
  return Math.min(
    CHIP_MAX_WIDTH_REM,
    Math.max(
      CHIP_MIN_WIDTH_REM,
      CHIP_HORIZONTAL_PADDING_REM + nickname.length * CHIP_CHAR_WIDTH_REM,
    ),
  );
}

function chipHalfExtentsPercent(
  nickname: string,
  containerHeightRem: number,
): { halfW: number; halfH: number } {
  const halfW = (chipWidthRem(nickname) / LOBBY_CONTAINER_WIDTH_REM) * 50;
  const halfH = (CHIP_HEIGHT_REM / containerHeightRem) * 50;
  return {
    halfW: halfW * ROTATION_PADDING,
    halfH: halfH * ROTATION_PADDING,
  };
}

function chipsOverlap(
  a: ScatterSpot,
  nickA: string,
  b: ScatterSpot,
  nickB: string,
  containerHeightRem: number,
): boolean {
  const fa = chipHalfExtentsPercent(nickA, containerHeightRem);
  const fb = chipHalfExtentsPercent(nickB, containerHeightRem);
  return (
    Math.abs(a.left - b.left) < fa.halfW + fb.halfW + CHIP_GAP_PERCENT &&
    Math.abs(a.top - b.top) < fa.halfH + fb.halfH + CHIP_GAP_PERCENT
  );
}

function scatterBounds(total: number): {
  minLeft: number;
  maxLeft: number;
  minTop: number;
  maxTop: number;
} {
  const padX = total <= 9 ? 14 : 10;
  const padY = total <= 9 ? 14 : 8;
  return {
    minLeft: padX,
    maxLeft: 100 - padX,
    minTop: padY,
    maxTop: 100 - padY,
  };
}

function seededCandidate(
  total: number,
  index: number,
  attempt: number,
): ScatterSpot {
  const h = hashString(`lobby-scatter:${total}:${index}:${attempt}`);
  const bounds = scatterBounds(total);
  const spanX = bounds.maxLeft - bounds.minLeft;
  const spanY = bounds.maxTop - bounds.minTop;
  return {
    left: bounds.minLeft + ((h % 1000) / 1000) * spanX,
    top: bounds.minTop + (((h >> 10) % 1000) / 1000) * spanY,
  };
}

function fitsInBounds(
  spot: ScatterSpot,
  nickname: string,
  containerHeightRem: number,
  total: number,
): boolean {
  const bounds = scatterBounds(total);
  const { halfW, halfH } = chipHalfExtentsPercent(nickname, containerHeightRem);
  return (
    spot.left - halfW >= bounds.minLeft &&
    spot.left + halfW <= bounds.maxLeft &&
    spot.top - halfH >= bounds.minTop &&
    spot.top + halfH <= bounds.maxTop
  );
}

function ringCandidates(index: number, total: number): ScatterSpot[] {
  const bounds = scatterBounds(total);
  const centerX = (bounds.minLeft + bounds.maxLeft) / 2;
  const centerY = (bounds.minTop + bounds.maxTop) / 2;
  const spots: ScatterSpot[] = [];

  for (let ring = 0; ring < 36; ring++) {
    const steps = 8 + ring * 2;
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * Math.PI * 2 + index * 0.61;
      const radius = 5 + ring * 2.8;
      spots.push({
        left: clamp(
          centerX + Math.cos(angle) * radius,
          bounds.minLeft,
          bounds.maxLeft,
        ),
        top: clamp(
          centerY + Math.sin(angle) * radius * 0.88,
          bounds.minTop,
          bounds.maxTop,
        ),
      });
    }
  }

  return spots;
}

function candidatePositions(
  playerIndex: number,
  total: number,
): ScatterSpot[] {
  const random: ScatterSpot[] = [];
  for (let attempt = 0; attempt < 1200; attempt++) {
    random.push(seededCandidate(total, playerIndex, attempt));
  }
  return [...random, ...ringCandidates(playerIndex, total)];
}

function tryLayoutAtHeight(
  players: LobbyPlayer[],
  heightRem: number,
): LobbyChipLayout[] | null {
  const total = players.length;
  const layout: LobbyChipLayout[] = [];

  for (let i = 0; i < total; i++) {
    const player = players[i];
    let placed: LobbyChipLayout | null = null;

    for (const position of candidatePositions(i, total)) {
      if (!fitsInBounds(position, player.nickname, heightRem, total)) continue;

      const overlaps = layout.some((spot, j) =>
        chipsOverlap(
          position,
          player.nickname,
          spot,
          players[j].nickname,
          heightRem,
        ),
      );
      if (overlaps) continue;

      placed = {
        ...position,
        rotate: -8 + (hashString(player.id) % 17),
      };
      break;
    }

    if (!placed) return null;
    layout.push(placed);
  }

  return layout;
}

/** Deterministic grid when scatter search fails — always collision-free. */
function fallbackGridLayout(
  players: LobbyPlayer[],
  startHeightRem: number,
): { layout: LobbyChipLayout[]; heightRem: number } {
  const total = players.length;
  const bounds = scatterBounds(total);
  const spanX = bounds.maxLeft - bounds.minLeft;
  const spanY = bounds.maxTop - bounds.minTop;

  for (let heightRem = startHeightRem; heightRem <= startHeightRem + 200; heightRem += 4) {
    let maxHalfW = 0;
    let maxHalfH = 0;
    for (const player of players) {
      const { halfW, halfH } = chipHalfExtentsPercent(player.nickname, heightRem);
      maxHalfW = Math.max(maxHalfW, halfW);
      maxHalfH = Math.max(maxHalfH, halfH);
    }

    const cellW = 2 * maxHalfW + CHIP_GAP_PERCENT;
    const cellH = 2 * maxHalfH + CHIP_GAP_PERCENT;
    const cols = Math.max(1, Math.floor(spanX / cellW));
    const rows = Math.ceil(total / cols);

    if (rows * cellH > spanY) continue;

    const offsetX = bounds.minLeft + (spanX - cols * cellW) / 2 + cellW / 2;
    const offsetY = bounds.minTop + (spanY - rows * cellH) / 2 + cellH / 2;

    const layout: LobbyChipLayout[] = players.map((player, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        left: offsetX + col * cellW,
        top: offsetY + row * cellH,
        rotate: -8 + (hashString(player.id) % 17),
      };
    });

    if (lobbyLayoutHasNoOverlaps(players, layout, heightRem)) {
      return { layout, heightRem };
    }
  }

  throw new Error("Could not place lobby chips without overlap");
}

function tightenDisplayHeight(
  players: LobbyPlayer[],
  layout: LobbyChipLayout[],
  layoutHeightRem: number,
): { layout: LobbyChipLayout[]; heightRem: number } {
  if (layout.length === 0) {
    return { layout, heightRem: lobbyChipsMinHeightRem(0) };
  }

  /** Room for float animation (~11px) plus a little breathing room. */
  const padRem = 1.5;
  let minEdgeRem = Infinity;
  let maxEdgeRem = -Infinity;

  for (let i = 0; i < layout.length; i++) {
    const { halfH } = chipHalfExtentsPercent(players[i].nickname, layoutHeightRem);
    const centerRem = (layout[i].top / 100) * layoutHeightRem;
    const halfHRem = (halfH / 100) * layoutHeightRem;
    minEdgeRem = Math.min(minEdgeRem, centerRem - halfHRem);
    maxEdgeRem = Math.max(maxEdgeRem, centerRem + halfHRem);
  }

  const contentRem = maxEdgeRem - minEdgeRem + padRem * 2;
  const displayHeightRem = Math.max(
    contentRem,
    CHIP_HEIGHT_REM * ROTATION_PADDING + padRem * 2,
  );

  const tightenedLayout = layout.map((spot) => {
    const centerRem = (spot.top / 100) * layoutHeightRem - minEdgeRem + padRem;
    return {
      ...spot,
      top: (centerRem / displayHeightRem) * 100,
    };
  });

  return { layout: tightenedLayout, heightRem: displayHeightRem };
}

function layoutCacheKey(players: LobbyPlayer[]): string {
  return players.map((p) => `${p.id}:${p.nickname}`).join("|");
}

/** Unique color per lobby slot (first 15 players never share a hue). */
export function playerChipPalette(index: number): PlayerChipPalette {
  return PLAYER_CHIP_PALETTES[index % PLAYER_CHIP_PALETTES.length];
}

export function playerChipSurfaceStyle(
  palette: PlayerChipPalette,
  rotate: number,
): Record<string, string | number> {
  return {
    backgroundColor: palette.bg,
    boxShadow: `0 4px 14px rgba(0, 0, 0, 0.28)`,
    transform: `rotate(${rotate}deg)`,
  };
}

export function lobbyChipsMinHeightRem(playerCount: number): number {
  if (playerCount <= 0) return 11;
  if (playerCount <= 1) return 11;
  if (playerCount <= 4) return 16;
  if (playerCount <= 8) return 22;
  if (playerCount <= 12) return 28;
  if (playerCount <= 16) return 34;
  if (playerCount <= 20) return 48;
  if (playerCount <= 25) return 56;
  return 64;
}

export function computeLobbyLayout(players: LobbyPlayer[]): {
  layout: LobbyChipLayout[];
  heightRem: number;
} {
  if (players.length === 0) {
    return { layout: [], heightRem: lobbyChipsMinHeightRem(0) };
  }

  const cacheKey = layoutCacheKey(players);
  const cached = layoutCache.get(cacheKey);
  if (cached) return cached;

  let heightRem = lobbyChipsMinHeightRem(players.length);
  for (let expand = 0; expand < 24; expand++) {
    const layout = tryLayoutAtHeight(players, heightRem);
    if (layout) {
      const result = tightenDisplayHeight(players, layout, heightRem);
      layoutCache.set(cacheKey, result);
      return result;
    }
    heightRem += 6;
  }

  const fallback = fallbackGridLayout(players, heightRem);
  const tightened = tightenDisplayHeight(
    players,
    fallback.layout,
    fallback.heightRem,
  );
  layoutCache.set(cacheKey, tightened);
  return tightened;
}

export function sortPlayersForLobby<T extends { id: string }>(players: T[]): T[] {
  return [...players].sort((a, b) => a.id.localeCompare(b.id));
}

export const LOBBY_CHIP_COLOR_COUNT = PLAYER_CHIP_PALETTES.length;

/** @internal test helper */
export function lobbyLayoutHasNoOverlaps(
  players: LobbyPlayer[],
  layout: LobbyChipLayout[],
  heightRem: number,
): boolean {
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      if (
        chipsOverlap(
          layout[i],
          players[i].nickname,
          layout[j],
          players[j].nickname,
          heightRem,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}
