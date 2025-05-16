import { Measure, Metric, reportBool } from '../metrics';
import { Chat, LLMTurn } from '../types';

export function regexResponseMetric(regex: RegExp): Metric {
  return {
    name: () => 'regexResponse',
    requiredParams: () => ['output'],
    measureTurn: async (turn: LLMTurn) => measureTurn(regex, turn),
    measureChat: async (chat: Chat) => measureChat(regex, chat)
  };
}

function measureTurn(regex: RegExp, turn: LLMTurn): Measure {
  return measure(regex, turn.output);
}

function measureChat(regex: RegExp, chat: Chat): Measure {
  if (!chat.turns || chat.turns.length === 0) {
    return reportBool(false, 'No turns in the chat');
  }
  const lastTurn = chat.turns[chat.turns.length - 1]!;
  return measure(regex, lastTurn.output);
}

function measure(regex: RegExp, text: string): Measure {
  const match = text.match(regex);
  if (match) {
    return reportBool(true, `The text matches the regex ${regex.source}`);
  } else {
    return reportBool(false, `The text does not match the regex ${regex.source}`);
  }
}
