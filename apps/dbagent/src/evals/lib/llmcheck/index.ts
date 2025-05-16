import { LanguageModel } from 'ai';
import { Measure, Metric } from './metrics/types';
import { Chat, LLMTurn, LLMTurnField } from './types';

export * from './types';

let evalModel: LanguageModel | undefined = undefined;

export function setEvalModel(model: LanguageModel | undefined) {
  evalModel = model;
}

export function getEvalModel(): LanguageModel {
  if (!evalModel) {
    throw new Error('Eval model not set');
  }
  return evalModel;
}

export async function evalAllTurn(
  turn: LLMTurn,
  metrics: Record<string, Metric> | Metric[]
): Promise<Record<string, Measure>> {
  const usedMetrics: [string, Metric][] = Array.isArray(metrics)
    ? metrics.filter(isMeasureTurnMetric).map((metric) => [metric.name(), metric])
    : Object.entries(metrics).filter(([_, metric]) => isMeasureTurnMetric(metric));
  if (usedMetrics.length === 0) {
    throw new Error('No metrics provided');
  }

  for (const [name, metric] of usedMetrics) {
    if (!turnHasFields(turn, metric.requiredParams())) {
      throw new Error(`Metric ${name} requires fields ${metric.requiredParams().join(', ')}`);
    }
  }

  const result: Record<string, Measure> = {};
  for (const [name, metric] of usedMetrics) {
    result[name] = await metric.measureTurn!(turn);
  }

  return result;
}

export async function evalTurn(turn: LLMTurn, metric: Metric): Promise<Measure> {
  if (!isMeasureTurnMetric(metric)) {
    throw new Error(`Metric ${metric.name()} is not a measure turn metric`);
  }
  if (!turnHasFields(turn, metric.requiredParams())) {
    throw new Error(`Metric ${metric.name()} requires fields ${metric.requiredParams().join(', ')}`);
  }
  return metric.measureTurn!(turn);
}

function isMeasureTurnMetric(metric: Metric) {
  return 'measureTurn' in metric && metric.measureTurn;
}

export function turnHasFields(turn: LLMTurn, fields: LLMTurnField[]) {
  return fields.every((field) => field in turn);
}

export function chatHasFields(chat: Chat, fields: LLMTurnField[]) {
  return chat.turns.every((turn) => turnHasFields(turn, fields));
}
