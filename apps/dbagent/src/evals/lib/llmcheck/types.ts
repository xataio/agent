export type Chat = {
  turns: LLMTurn[];
  name?: string;
};

export type LLMTurnField = keyof LLMTurn;

export type LLMTurn = {
  name?: string;
  input: string;
  output: string;
  expectedOutput?: string;
  reasoning?: string;
  tokenCost?: number;
  durationMs?: number;
  context?: LLMTurn[];
  toolCalls?: ToolCall[];
  expectedTools?: ToolCall[];
};

export type ToolCallFields = keyof ToolCall;

export type ToolCall = {
  name: string;
  description?: string;
  inputs?: any[];
  output?: any;
};
