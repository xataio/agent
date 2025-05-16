import { LLMTurn, ToolCall } from '../types';
import { Measure, Metric, reportScoreBool } from './types';

export type ToolChoiceProps = {
  expectedToolCalls?: ToolCall[];
  allowOthers: boolean;
  allowMissing: boolean;
};

export function toolChoiceMetric(props: ToolChoiceProps): Metric {
  return {
    name: () => 'toolChoice',
    requiredParams: () => (props.expectedToolCalls ? ['toolCalls'] : ['toolCalls', 'expectedTools']),
    measureTurn: async (turn: LLMTurn) => measureTurn(turn, props)
  };
}

// toolChoice uses the expectedTools from the LLMTurn configuration
export const toolChoice = toolChoiceMetric({ allowOthers: false, allowMissing: false });

function measureTurn(turn: LLMTurn, { expectedToolCalls, allowOthers, allowMissing }: ToolChoiceProps): Measure {
  const expectedToolsSet = new Set([
    ...(turn.expectedTools?.map((tool) => tool.name) ?? []),
    ...(expectedToolCalls?.map((tool) => tool.name) ?? [])
  ]);
  const actualToolsSet = new Set(turn.toolCalls?.map((tool) => tool.name) ?? []);

  const missing = [...expectedToolsSet].filter((tool) => !actualToolsSet.has(tool)).sort();
  const others = [...actualToolsSet].filter((tool) => !expectedToolsSet.has(tool)).sort();

  const errorReport: string[] = [];
  let success = true;
  if (missing.length > 0) {
    errorReport.push(`Missing tools: ${missing.join(', ')}`);
    if (!allowMissing) {
      success = false;
    }
  }
  if (others.length > 0) {
    errorReport.push(`Unexpected tools: ${others.join(', ')}`);
    if (!allowOthers) {
      success = false;
    }
  }

  const total = expectedToolsSet.size;
  const expectedCount = total - errorReport.length;
  const score = total > 0 ? expectedCount / total : 0;

  return reportScoreBool(score, success, errorReport.join('\n'));
}
