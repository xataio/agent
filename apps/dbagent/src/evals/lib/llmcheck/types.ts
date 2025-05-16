export type Chat = {
  id?: string;
  turns: LLMTurn[];
  name?: string;
};

export type LLMTurnField = keyof LLMTurn;

export type LLMTurn = {
  id?: string;
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
  id?: string;
  name: string;
  description?: string;
  inputs?: any[];
  output?: any;
};
