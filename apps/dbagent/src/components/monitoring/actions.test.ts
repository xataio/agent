import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DBAccess, getUserSessionDBAccess } from '~/lib/db/db';
import { Schedule, ScheduleRun, Connection, Project, User } from '~/lib/db/schema';
import { actionGetSchedules, ScheduleWithProblemDetails } from './actions';
import * as auth from '~/auth'; // Mocking auth

// Mock dependencies
vi.mock('~/auth', () => ({
  auth: vi.fn()
}));

vi.mock('~/lib/db/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/db/db')>();
  return {
    ...actual,
    getUserSessionDBAccess: vi.fn()
  };
});

const mockUser: User = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: new Date(),
  image: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockDBAccessQuery = vi.fn();
const mockDBAccess: DBAccess = {
  query: mockDBAccessQuery,
  getPool: vi.fn() as any,
  close: vi.fn()
};

describe('actionGetSchedules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (auth.auth as vi.Mock).mockResolvedValue({ user: mockUser });
    (getUserSessionDBAccess as vi.Mock).mockResolvedValue(mockDBAccess);
  });

  const baseSchedule: Omit<Schedule, 'id' | 'lastRun' | 'nextRun' | 'status' | 'failures'> = {
    userId: 'test-user-id',
    connectionId: 'conn-1',
    playbook: 'test-playbook',
    scheduleType: 'cron',
    cronExpression: '0 0 * * *',
    model: 'gpt-4',
    enabled: true,
    notifyLevel: 'alert',
    additionalInstructions: null,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    keepHistory: 10,
    maxSteps: 5,
    extraNotificationText: null,
  };

  it('should return schedules without problem details if no problematic runs exist', async () => {
    const schedules: Schedule[] = [
      { ...baseSchedule, id: 'schedule-1', lastRun: null, nextRun: new Date('2023-01-02T00:00:00.000Z').toISOString(), status: 'scheduled', failures: 0 },
    ];
    mockDBAccessQuery
      .mockResolvedValueOnce(schedules) // for getSchedules
      .mockResolvedValueOnce([]); // for getLatestProblematicRun for schedule-1

    const result = await actionGetSchedules();

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('schedule-1');
    expect(result[0].lastRunProblemSummary).toBeUndefined();
    expect(result[0].lastRunProblemLevel).toBeUndefined();
    expect(result[0].lastRunProblemDate).toBeUndefined();
    expect(result[0].nextRun).toBe(new Date('2023-01-02T00:00:00.000Z').toString());
  });

  it('should return schedule with warning details', async () => {
    const schedules: Schedule[] = [
      { ...baseSchedule, id: 'schedule-2', lastRun: new Date('2023-01-01T10:00:00.000Z').toISOString(), nextRun: new Date('2023-01-02T10:00:00.000Z').toISOString(), status: 'scheduled', failures: 0 },
    ];
    const problematicRun: ScheduleRun = {
      id: 'run-2-warn',
      scheduleId: 'schedule-2',
      projectId: 'proj-1',
      summary: 'Warning: High CPU usage',
      notificationLevel: 'warning',
      result: 'Detailed warning result',
      messages: [],
      createdAt: new Date('2023-01-01T09:00:00.000Z'),
      updatedAt: new Date('2023-01-01T09:00:00.000Z'),
    };
    mockDBAccessQuery
      .mockResolvedValueOnce(schedules) // getSchedules
      .mockResolvedValueOnce([problematicRun]); // getLatestProblematicRun for schedule-2

    const result = await actionGetSchedules();

    expect(result.length).toBe(1);
    const s2 = result[0];
    expect(s2.id).toBe('schedule-2');
    expect(s2.lastRunProblemSummary).toBe('Warning: High CPU usage');
    expect(s2.lastRunProblemLevel).toBe('warning');
    expect(s2.lastRunProblemDate).toBe(new Date('2023-01-01T09:00:00.000Z').toString());
    expect(s2.lastRun).toBe(new Date('2023-01-01T10:00:00.000Z').toString());
  });

  it('should return schedule with alert details', async () => {
    const schedules: Schedule[] = [
      { ...baseSchedule, id: 'schedule-3', lastRun: null, nextRun: new Date('2023-01-03T00:00:00.000Z').toISOString(), status: 'scheduled', failures: 1 },
    ];
    const problematicRun: ScheduleRun = {
      id: 'run-3-alert',
      scheduleId: 'schedule-3',
      projectId: 'proj-1',
      summary: 'Alert: System down',
      notificationLevel: 'alert',
      result: 'Detailed alert result',
      messages: [],
      createdAt: new Date('2023-01-02T15:00:00.000Z'),
      updatedAt: new Date('2023-01-02T15:00:00.000Z'),
    };
    mockDBAccessQuery
      .mockResolvedValueOnce(schedules)
      .mockResolvedValueOnce([problematicRun]);

    const result = await actionGetSchedules();
    expect(result.length).toBe(1);
    const s3 = result[0];
    expect(s3.id).toBe('schedule-3');
    expect(s3.lastRunProblemSummary).toBe('Alert: System down');
    expect(s3.lastRunProblemLevel).toBe('alert');
    expect(s3.lastRunProblemDate).toBe(new Date('2023-01-02T15:00:00.000Z').toString());
  });

  it('should pick the most recent problematic run (alert over older warning)', async () => {
    const schedules: Schedule[] = [
      { ...baseSchedule, id: 'schedule-4', lastRun: null, nextRun: null, status: 'disabled', failures: 2 },
    ];
    // getLatestProblematicRun is already designed to return only the most recent one.
    // So, the mock for it should return the one we expect.
    const mostRecentProblematicRun: ScheduleRun = {
      id: 'run-4-alert-recent',
      scheduleId: 'schedule-4',
      projectId: 'proj-1',
      summary: 'Recent Alert: Critical issue',
      notificationLevel: 'alert',
      result: 'Detailed recent alert',
      messages: [],
      createdAt: new Date('2023-01-03T12:00:00.000Z'), // More recent
      updatedAt: new Date('2023-01-03T12:00:00.000Z'),
    };

    mockDBAccessQuery
      .mockResolvedValueOnce(schedules)
      .mockResolvedValueOnce([mostRecentProblematicRun]); // Simulates getLatestProblematicRun finding this one

    const result = await actionGetSchedules();
    expect(result.length).toBe(1);
    const s4 = result[0];
    expect(s4.id).toBe('schedule-4');
    expect(s4.lastRunProblemSummary).toBe('Recent Alert: Critical issue');
    expect(s4.lastRunProblemLevel).toBe('alert');
    expect(s4.lastRunProblemDate).toBe(new Date('2023-01-03T12:00:00.000Z').toString());
  });

  it('should not show problem details if latest problematic run is older than an info run (but getLatestProblematicRun handles this)', async () => {
    // The function getLatestProblematicRun itself filters for 'alert' or 'warning'.
    // So, if an 'info' run is the absolute latest, getLatestProblematicRun would return the latest 'alert' or 'warning'.
    // If there are no 'alert' or 'warning' runs, it returns null.
    const schedules: Schedule[] = [
      { ...baseSchedule, id: 'schedule-5', lastRun: new Date('2023-01-04T00:00:00.000Z').toISOString(), nextRun: null, status: 'scheduled', failures: 1 }, // lastRun is an info run
    ];
    // This is the latest 'alert' run, even if an 'info' run happened after it.
    const olderAlertRun: ScheduleRun = {
      id: 'run-5-alert-older',
      scheduleId: 'schedule-5',
      projectId: 'proj-1',
      summary: 'Older Alert: Disk space low',
      notificationLevel: 'alert',
      result: 'Detailed older alert',
      messages: [],
      createdAt: new Date('2023-01-03T10:00:00.000Z'), // Older than the 'lastRun' of schedule-5
      updatedAt: new Date('2023-01-03T10:00:00.000Z'),
    };

    mockDBAccessQuery
      .mockResolvedValueOnce(schedules)
      .mockResolvedValueOnce([olderAlertRun]); // getLatestProblematicRun found this older alert

    const result = await actionGetSchedules();
    expect(result.length).toBe(1);
    const s5 = result[0];
    expect(s5.id).toBe('schedule-5');
    expect(s5.lastRunProblemSummary).toBe('Older Alert: Disk space low');
    expect(s5.lastRunProblemLevel).toBe('alert');
    expect(s5.lastRunProblemDate).toBe(new Date('2023-01-03T10:00:00.000Z').toString());
    expect(s5.lastRun).toBe(new Date('2023-01-04T00:00:00.000Z').toString()); // This remains the actual last run
  });

  it('should correctly handle multiple schedules with and without problems', async () => {
    const schedule1: Schedule = { ...baseSchedule, id: 'multi-1', lastRun: null, nextRun: new Date('2023-01-10T00:00:00.000Z').toISOString(), status: 'scheduled', failures: 0 };
    const schedule2: Schedule = { ...baseSchedule, id: 'multi-2', lastRun: new Date('2023-01-09T00:00:00.000Z').toISOString(), nextRun: new Date('2023-01-11T00:00:00.000Z').toISOString(), status: 'scheduled', failures: 3 };
    const schedule3: Schedule = { ...baseSchedule, id: 'multi-3', lastRun: null, nextRun: null, status: 'disabled', failures: 0 };


    const problematicRunForS2: ScheduleRun = {
      id: 'run-m2-alert',
      scheduleId: 'multi-2',
      projectId: 'proj-1',
      summary: 'Alert for Multi-2',
      notificationLevel: 'alert',
      result: 'Detailed alert',
      messages: [],
      createdAt: new Date('2023-01-08T00:00:00.000Z'),
      updatedAt: new Date('2023-01-08T00:00:00.000Z'),
    };

    mockDBAccessQuery
      .mockResolvedValueOnce([schedule1, schedule2, schedule3]) // getSchedules
      .mockResolvedValueOnce([]) // getLatestProblematicRun for multi-1
      .mockResolvedValueOnce([problematicRunForS2]) // getLatestProblematicRun for multi-2
      .mockResolvedValueOnce([]); // getLatestProblematicRun for multi-3

    const results = await actionGetSchedules();
    expect(results.length).toBe(3);

    const r1 = results.find(r => r.id === 'multi-1')!;
    expect(r1.lastRunProblemSummary).toBeUndefined();
    expect(r1.lastRunProblemLevel).toBeUndefined();
    expect(r1.lastRunProblemDate).toBeUndefined();
    expect(r1.nextRun).toBe(new Date('2023-01-10T00:00:00.000Z').toString());


    const r2 = results.find(r => r.id === 'multi-2')!;
    expect(r2.lastRunProblemSummary).toBe('Alert for Multi-2');
    expect(r2.lastRunProblemLevel).toBe('alert');
    expect(r2.lastRunProblemDate).toBe(new Date('2023-01-08T00:00:00.000Z').toString());
    expect(r2.lastRun).toBe(new Date('2023-01-09T00:00:00.000Z').toString());

    const r3 = results.find(r => r.id === 'multi-3')!;
    expect(r3.lastRunProblemSummary).toBeUndefined();
    expect(r3.lastRunProblemLevel).toBeUndefined();
    expect(r3.lastRunProblemDate).toBeUndefined();
    expect(r3.nextRun).toBeNull(); // Assuming utcToLocalDate handles null nextRun correctly
  });
});
