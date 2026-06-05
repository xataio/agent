import { describe, expect, it } from 'vitest';
import { buildReplayManifest } from './trace';

const response = {
  request: {
    body: JSON.stringify({
      model: 'test-provider/test-model',
      system: [{ text: 'You are a PostgreSQL agent.' }],
      messages: [{ content: [{ text: 'Describe the dogs table' }] }]
    })
  },
  text: 'The dogs table has an id and name column.',
  steps: [
    {
      text: '',
      toolCalls: [
        {
          toolCallId: 'call-1',
          toolName: 'describeTable',
          args: { table: 'dogs' }
        }
      ],
      toolResults: [
        {
          toolCallId: 'call-1',
          toolName: 'describeTable',
          args: { table: 'dogs' },
          result: { columns: ['id', 'name'] }
        }
      ]
    }
  ]
} as any;

describe('buildReplayManifest', () => {
  it('captures prompts, model metadata and tool calls for replayable eval diagnostics', () => {
    const manifest = buildReplayManifest({
      id: 'describe_table',
      response,
      metadata: {
        scenario: 'tool-choice',
        toolPolicy: {
          expectedToolCalls: ['describeTable'],
          allowOtherTools: false
        }
      }
    });

    expect(manifest.provider.model).toBe('test-provider/test-model');
    expect(manifest.prompts.user).toBe('Describe the dogs table');
    expect(manifest.steps[0]?.toolCalls[0]).toMatchObject({
      step: 1,
      toolName: 'describeTable',
      hasResult: true
    });
    expect(manifest.diagnostics.classifications).toEqual([]);
  });

  it('classifies missing expected tools and disallowed extra tools', () => {
    const manifest = buildReplayManifest({
      id: 'wrong_tool',
      response,
      metadata: {
        toolPolicy: {
          expectedToolCalls: ['getTablesAndInstanceInfo'],
          allowOtherTools: false
        }
      }
    });

    expect(manifest.diagnostics.classifications).toEqual(['missing-expected-tool', 'unexpected-tool-call']);
    expect(manifest.diagnostics.missingExpectedToolCalls).toEqual(['getTablesAndInstanceInfo']);
    expect(manifest.diagnostics.unexpectedToolCalls).toEqual(['describeTable']);
  });

  it('classifies malformed provider request bodies and tool failures', () => {
    const manifest = buildReplayManifest({
      id: 'tool_error',
      response: {
        ...response,
        request: { body: '{not-json' },
        text: '',
        steps: [
          {
            text: '',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'safeExplainQuery', args: { query: 'select * from dogs' } }],
            toolResults: [
              {
                toolCallId: 'call-1',
                toolName: 'safeExplainQuery',
                result: { error: 'permission denied' }
              }
            ]
          }
        ]
      }
    });

    expect(manifest.diagnostics.classifications).toEqual([
      'malformed-request',
      'missing-system-prompt',
      'missing-user-prompt',
      'tool-error',
      'empty-final-answer'
    ]);
    expect(manifest.diagnostics.toolErrors[0]).toMatchObject({
      toolName: 'safeExplainQuery',
      error: 'permission denied'
    });
  });

  it('classifies tool calls that never produce a result', () => {
    const manifest = buildReplayManifest({
      id: 'missing_tool_result',
      response: {
        ...response,
        steps: [
          {
            text: '',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'getSlowQueries', args: {} }],
            toolResults: []
          }
        ]
      }
    });

    expect(manifest.diagnostics.classifications).toEqual(['no-tool-result']);
  });
});
