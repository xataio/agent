import { Chat, LLMTurn, LLMTurnField } from '../types';

export type Metric = {
  name: () => string;
  requiredParams: () => LLMTurnField[];
  measureTurn?: (turn: LLMTurn) => PromiseLike<Measure>;
  measureChat?: (chat: Chat) => PromiseLike<Measure>;
};

export type Measure = ScoreMeasure | BoolMeasure;

export type BoolMeasure = {
  type: 'bool';
  success: boolean;
  reason?: string;
};

export function reportBool(success: boolean, reason?: string): Measure {
  return {
    type: 'bool',
    success,
    reason
  };
}

export type ScoreMeasure = {
  type: 'score';
  success: boolean;
  score: number;
  reason?: string;
};

export function reportScore(score: number, min_success: number, reason?: string): Measure {
  return {
    type: 'score',
    success: score >= min_success,
    score,
    reason
  };
}

export function reportScoreBool(score: number, success: boolean, reason?: string): Measure {
  return {
    type: 'score',
    success,
    score,
    reason
  };
}
