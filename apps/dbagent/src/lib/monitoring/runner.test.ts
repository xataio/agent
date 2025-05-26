import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { DBAccess } from '~/lib/db/db';
import { Schedule, Connection, Project, ScheduleRunInsert, User } from '~/lib/db/schema';
import { runSchedule } from './runner';
import *  as connectionsDb from '~/lib/db/connections';
import * as projectsDb from '~/lib/db/projects';
import * as scheduleRunsDb from '~/lib/db/schedule-runs';
import * as schedulesDb from '~/lib/db/schedules';
import * as aiAgent from '~/lib/ai/agent';
import * as ai from 'ai';
import * as targetDb from '~/lib/targetdb/db';
import * as notifications from '~/lib/notifications/slack-webhook';
import * as playbooks from '~/lib/tools/playbooks';
import { LanguageModelV1 } from 'ai';
import { Message } from '@ai-sdk/ui-utils';

// Mock all dependencies
vi.mock('~/lib/db/connections');
vi.mock('~/lib/db/projects');
vi.mock('~/lib/db/schedule-runs');
vi.mock('~/lib/db/schedules');
vi.mock('~/lib/ai/agent');
vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof import('ai')>();
    return {
        ...actual,
        generateText: vi.fn(),
        generateObject: vi.fn(),
        generateId: vi.fn().mockReturnValue('mock-id') // Mock generateId as well
    };
});
vi.mock('~/lib/targetdb/db');
vi.mock('~/lib/notifications/slack-webhook');
vi.mock('~/lib/tools/playbooks');


const mockDBAccess: DBAccess = {
  query: vi.fn(),
  getPool: vi.fn() as any,
  close: vi.fn()
};

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: new Date(),
  image: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockSchedule: Schedule = {
  id: 'schedule-1',
  userId: mockUser.id,
  connectionId: 'conn-1',
  playbook: 'test-playbook',
  scheduleType: 'cron',
  cronExpression: '0 0 * * *',
  model: 'gpt-4',
  enabled: true,
  notifyLevel: 'warning',
  additionalInstructions: 'Run carefully',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastRun: null,
  nextRun: null,
  status: 'scheduled',
  failures: 0,
  keepHistory: 10,
  maxSteps: 3,
  extraNotificationText: null,
};

const mockConnection: Connection = {
  id: 'conn-1',
  userId: mockUser.id,
  projectId: 'project-1',
  name: 'Test Connection',
  connectionString: 'postgresql://test:test@localhost/test',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockProject: Project = {
  id: 'project-1',
  userId: mockUser.id,
  name: 'Test Project',
  cloudProvider: 'aws',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockModelInstance = { id: 'test-model' } as unknown as LanguageModelV1;
const mockMonitoringModel = {
    instance: () => mockModelInstance,
    isFallback: false,
    info: () => ({ id: 'test-model-info' })
};

describe('runSchedule', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default mocks for all imported modules
    (connectionsDb.getConnectionFromSchedule as vi.Mock).mockResolvedValue(mockConnection);
    (projectsDb.getProjectById as vi.Mock).mockResolvedValue(mockProject);
    (scheduleRunsDb.insertScheduleRunLimitHistory as vi.Mock).mockImplementation(async (db, runInsert) => ({
      ...runInsert,
      id: 'run-1',
      updatedAt: new Date(),
    } as ScheduleRunInsert & { id: string; updatedAt: Date })); // Ensure return matches expected type
    (schedulesDb.incrementScheduleFailures as vi.Mock).mockResolvedValue(undefined);
    (aiAgent.getMonitoringModel as vi.Mock).mockResolvedValue(mockMonitoringModel);
    (aiAgent.getMonitoringSystemPrompt as vi.Mock).mockReturnValue('System Prompt');
    (targetDb.getTargetDbPool as vi.Mock).mockReturnValue({ end: vi.fn().mockResolvedValue(undefined) } as any);
    (notifications.sendScheduleNotification as vi.Mock).mockResolvedValue(undefined);
    (playbooks.listPlaybooks as vi.Mock).mockReturnValue(['playbook1', 'playbook2']);

    // Mock AI SDK generateText and generateObject
    (ai.generateText as MockedFunction<typeof ai.generateText>).mockResolvedValue({
      text: 'Playbook run result text',
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      rawResponse: undefined,
      warnings: [],
      finishTimestamp: new Date(),
      logprobs: undefined,
    });
  });

  const mockDecideNotificationLevel = (level: 'info' | 'warning' | 'alert', summary = 'Test summary') => {
    (ai.generateObject as MockedFunction<typeof ai.generateObject>).mockImplementation(async (options) => {
        if (options.schema.safeParse({ summary: '', notificationLevel: 'info' }).success) { // Check if it's the notification schema
             return {
                object: { summary, notificationLevel: level },
                finishReason: 'stop',
                usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
                rawResponse: undefined,
                finishTimestamp: new Date(),
                warnings: [],
                toolCalls: [],
                toolResults: [],
             };
        }
        // For decideNextPlaybook
        return {
            object: { shouldRunPlaybook: false, recommendedPlaybook: undefined },
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
            rawResponse: undefined,
            finishTimestamp: new Date(),
            warnings: [],
            toolCalls: [],
            toolResults: [],
        }
    });
  };

  it('should NOT call incrementScheduleFailures if notificationLevel is "info"', async () => {
    mockDecideNotificationLevel('info', 'Everything is fine.');
    await runSchedule(mockDBAccess, mockSchedule, new Date());

    expect(schedulesDb.incrementScheduleFailures).not.toHaveBeenCalled();
    expect(scheduleRunsDb.insertScheduleRunLimitHistory).toHaveBeenCalled();
    expect(notifications.sendScheduleNotification).not.toHaveBeenCalled(); // since default notifyLevel is 'warning'
  });

  it('should NOT call incrementScheduleFailures if notificationLevel is "warning"', async () => {
    mockDecideNotificationLevel('warning', 'Minor issue detected.');
    await runSchedule(mockDBAccess, mockSchedule, new Date());

    expect(schedulesDb.incrementScheduleFailures).not.toHaveBeenCalled();
    expect(scheduleRunsDb.insertScheduleRunLimitHistory).toHaveBeenCalled();
    expect(notifications.sendScheduleNotification).toHaveBeenCalled(); // default notifyLevel is 'warning'
  });

  it('SHOULD call incrementScheduleFailures if notificationLevel is "alert"', async () => {
    mockDecideNotificationLevel('alert', 'Critical issue found!');
    await runSchedule(mockDBAccess, mockSchedule, new Date());

    expect(schedulesDb.incrementScheduleFailures).toHaveBeenCalledWith(mockDBAccess, mockSchedule);
    expect(schedulesDb.incrementScheduleFailures).toHaveBeenCalledTimes(1);
    expect(scheduleRunsDb.insertScheduleRunLimitHistory).toHaveBeenCalled();
    expect(notifications.sendScheduleNotification).toHaveBeenCalled(); // default notifyLevel is 'warning', alert is higher
  });

  it('should call insertScheduleRunLimitHistory with correct data', async () => {
    const runDate = new Date('2023-05-01T10:00:00.000Z');
    mockDecideNotificationLevel('warning', 'A test warning.');
    (ai.generateText as MockedFunction<typeof ai.generateText>)
        .mockResolvedValueOnce({ // For runModelPlaybook
            text: 'Initial playbook run text.',
            toolCalls: [], toolResults: [], finishReason: 'stop', usage: {promptTokens:1, completionTokens:1, totalTokens:2}, rawResponse: undefined, warnings: [], finishTimestamp: new Date(), logprobs: undefined,
        })
        .mockResolvedValueOnce({ // For summarizeResult
            text: 'Final summary of the run.',
            toolCalls: [], toolResults: [], finishReason: 'stop', usage: {promptTokens:1, completionTokens:1, totalTokens:2}, rawResponse: undefined, warnings: [], finishTimestamp: new Date(), logprobs: undefined,
        });


    await runSchedule(mockDBAccess, mockSchedule, runDate);

    expect(scheduleRunsDb.insertScheduleRunLimitHistory).toHaveBeenCalledWith(
      mockDBAccess,
      expect.objectContaining({
        projectId: mockProject.id,
        scheduleId: mockSchedule.id,
        result: 'Final summary of the run.',
        summary: 'A test warning.',
        notificationLevel: 'warning',
        messages: expect.any(Array<Message>), // Check that messages array is passed
        createdAt: runDate,
      }),
      mockSchedule.keepHistory
    );
    const messagesArg = (scheduleRunsDb.insertScheduleRunLimitHistory as vi.Mock).mock.calls[0][1].messages;
    expect(messagesArg.length).toBeGreaterThanOrEqual(4); // system, initial playbook, notification decision, summary
  });

  it('should handle playbook drilling down if maxSteps > 1 and notification threshold met', async () => {
    const scheduleWithDrilldown: Schedule = { ...mockSchedule, maxSteps: 3, notifyLevel: 'info' };
    mockDecideNotificationLevel('warning', 'Initial warning, needs drilldown.');

    // Mock generateObject for decideNextPlaybook to recommend another playbook first, then stop
    (ai.generateObject as MockedFunction<typeof ai.generateObject>)
      .mockResolvedValueOnce({ // decideNotificationLevel
        object: { summary: 'Initial warning, needs drilldown.', notificationLevel: 'warning' },
        finishReason: 'stop', usage: {promptTokens:1,completionTokens:1,totalTokens:2}, rawResponse:undefined, finishTimestamp:new Date(), warnings:[], toolCalls:[], toolResults:[]
      })
      .mockResolvedValueOnce({ // decideNextPlaybook - step 1 (recommend)
        object: { shouldRunPlaybook: true, recommendedPlaybook: 'drilldown-playbook-1' },
        finishReason: 'stop', usage: {promptTokens:1,completionTokens:1,totalTokens:2}, rawResponse:undefined, finishTimestamp:new Date(), warnings:[], toolCalls:[], toolResults:[]
      })
      .mockResolvedValueOnce({ // decideNextPlaybook - step 2 (stop)
        object: { shouldRunPlaybook: false, recommendedPlaybook: undefined },
        finishReason: 'stop', usage: {promptTokens:1,completionTokens:1,totalTokens:2}, rawResponse:undefined, finishTimestamp:new Date(), warnings:[], toolCalls:[], toolResults:[]
      });

    // Mock generateText for each playbook run and the final summary
    (ai.generateText as MockedFunction<typeof ai.generateText>)
        .mockResolvedValueOnce({ text: 'Initial playbook output.', toolCalls: [], toolResults: [], finishReason: 'stop', usage: {promptTokens:1, completionTokens:1, totalTokens:2}, rawResponse: undefined, warnings: [], finishTimestamp: new Date(), logprobs: undefined, }) // runModelPlaybook (initial)
        .mockResolvedValueOnce({ text: 'Drilldown playbook 1 output.', toolCalls: [], toolResults: [], finishReason: 'stop', usage: {promptTokens:1, completionTokens:1, totalTokens:2}, rawResponse: undefined, warnings: [], finishTimestamp: new Date(), logprobs: undefined, }) // runModelPlaybook (drilldown-1)
        .mockResolvedValueOnce({ text: 'Final summary after drilldown.', toolCalls: [], toolResults: [], finishReason: 'stop', usage: {promptTokens:1, completionTokens:1, totalTokens:2}, rawResponse: undefined, warnings: [], finishTimestamp: new Date(), logprobs: undefined, }); // summarizeResult


    await runSchedule(mockDBAccess, scheduleWithDrilldown, new Date());

    expect(ai.generateObject).toHaveBeenCalledTimes(3); // 1 for notification, 2 for playbook recommendations
    expect(ai.generateText).toHaveBeenCalledTimes(3); // 2 playbook runs + 1 summary
    expect(schedulesDb.incrementScheduleFailures).not.toHaveBeenCalled(); // Still 'warning'
    expect(notifications.sendScheduleNotification).toHaveBeenCalled(); // notifyLevel 'info', outcome 'warning'
  });
});
