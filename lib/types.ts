export type RoomStatus = "lobby" | "playing" | "finished";
export type Phase = "countdown" | "peek" | "flashcut" | "guess" | "reveal";
export type ImageMode = "zoom" | "silhouette" | "blur";

export interface Crop {
  x: number;
  y: number;
  scale: number;
}

export interface RoundDefinition {
  id: string;
  mode: ImageMode;
  imageUrl: string;
  crop?: Crop;
  choices: [string, string, string, string];
  answer: string;
  category: "objects" | "animals" | "food" | "world";
}

export interface Pack {
  id: string;
  name: string;
  rounds: RoundDefinition[];
}

export interface Player {
  id: string;
  nickname: string;
  token: string;
  totalScore: number;
  roundsCorrect: number;
  joinedAt: number;
}

export interface PlayerAnswer {
  choice: string;
  lockedAt: number;
}

export interface RoundResult {
  roundIndex: number;
  scores: Record<string, number>;
}

export interface AnswerStats {
  correct: number;
  wrong: number;
}

export interface PlayerAnswerStatsRow {
  playerId: string;
  nickname: string;
  totalScore: number;
  correct: number;
  wrong: number;
}

export type RoundAnswerOutcome = "correct" | "wrong" | "none";

export interface RoundPlayerAnswer {
  playerId: string;
  nickname: string;
  choice?: string;
  outcome: RoundAnswerOutcome;
  roundScore?: number;
}

export interface Room {
  code: string;
  hostId: string;
  hostToken: string;
  hostPinHash?: string;
  status: RoomStatus;
  packId: string;
  roundIndex: number;
  phase: Phase;
  phaseStartedAt: number;
  players: Record<string, Player>;
  answers: Record<string, PlayerAnswer>;
  roundResults: RoundResult[];
  createdAt: number;
  maxPlayers: number;
  version: number;
  winnerId?: string;
  /** Per-room round overrides (editable in lobby). */
  customRounds?: RoundDefinition[];
}

export interface RoomPublicState {
  code: string;
  status: RoomStatus;
  roundIndex: number;
  roundCount: number;
  phase: Phase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  players: Array<{ id: string; nickname: string; totalScore: number }>;
  standings: Array<{ id: string; nickname: string; totalScore: number }>;
  imageUrl?: string;
  imageMode?: ImageMode;
  crop?: Crop;
  choices?: [string, string, string, string];
  answer?: string;
  roundScores?: Record<string, number>;
  yourAnswer?: string;
  yourRoundScore?: number;
  winnerId?: string;
  answerStats?: AnswerStats;
  yourAnswerStats?: AnswerStats;
  /** Host-only: per-player correct/wrong counts when the game is finished. */
  playerAnswerStats?: PlayerAnswerStatsRow[];
  roundPlayerAnswers?: RoundPlayerAnswer[];
}

export interface ApiErrorBody {
  error: string;
  code: string;
}
