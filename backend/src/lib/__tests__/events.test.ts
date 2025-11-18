import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../events.js';

describe('Event Bus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should emit and handle events', async () => {
    const handler = vi.fn();
    eventBus.on('retention.job.started', handler);

    await eventBus.emit('retention.job.started', {
      jobId: 'job-123',
      ruleId: 'rule-456',
      ruleName: 'Test Rule',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retention.job.started',
        payload: {
          jobId: 'job-123',
          ruleId: 'rule-456',
          ruleName: 'Test Rule',
        },
      })
    );
  });

  it('should handle multiple handlers for same event', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    eventBus.on('retention.job.completed', handler1);
    eventBus.on('retention.job.completed', handler2);

    await eventBus.emit('retention.job.completed', {
      jobId: 'job-123',
      ruleId: 'rule-456',
      affectedCount: 100,
      durationMs: 1000,
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove event handlers', async () => {
    const handler = vi.fn();
    eventBus.on('retention.job.failed', handler);
    eventBus.off('retention.job.failed', handler);

    await eventBus.emit('retention.job.failed', {
      jobId: 'job-123',
      ruleId: 'rule-456',
      error: 'Test error',
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should include metadata in events', async () => {
    const handler = vi.fn();
    eventBus.on('records.deleted', handler);

    await eventBus.emit(
      'records.deleted',
      {
        dataSourceId: 'ds-123',
        table: 'events',
        count: 50,
        ruleName: 'Delete Old Events',
      },
      { userId: 'user-123' }
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: 'user-123' },
      })
    );
  });
});
