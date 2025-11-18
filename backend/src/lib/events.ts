import { logger } from './logger.js';

// Domain event types
export type DomainEventType =
  | 'retention.job.started'
  | 'retention.job.completed'
  | 'retention.job.failed'
  | 'retention.rule.created'
  | 'retention.rule.updated'
  | 'retention.rule.deleted'
  | 'retention.rule.executed'
  | 'data_source.created'
  | 'data_source.updated'
  | 'data_source.deleted'
  | 'records.deleted'
  | 'records.anonymized'
  | 'records.archived';

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  timestamp: Date;
  payload: T;
  metadata?: Record<string, unknown>;
}

export interface RetentionJobStartedEvent {
  jobId: string;
  ruleId: string;
  ruleName: string;
}

export interface RetentionJobCompletedEvent {
  jobId: string;
  ruleId: string;
  affectedCount: number;
  durationMs: number;
}

export interface RetentionJobFailedEvent {
  jobId: string;
  ruleId: string;
  error: string;
}

export interface RecordsDeletedEvent {
  dataSourceId: string;
  table: string;
  count: number;
  ruleName: string;
}

export interface RecordsAnonymizedEvent {
  dataSourceId: string;
  table: string;
  count: number;
  fields: string[];
  ruleName: string;
}

type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

class EventBus {
  private handlers: Map<DomainEventType, EventHandler[]> = new Map();

  on<T = unknown>(type: DomainEventType, handler: EventHandler<T>) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(type, handlers);
  }

  off<T = unknown>(type: DomainEventType, handler: EventHandler<T>) {
    const handlers = this.handlers.get(type) || [];
    const filtered = handlers.filter((h) => h !== handler);
    this.handlers.set(type, filtered);
  }

  async emit<T = unknown>(type: DomainEventType, payload: T, metadata?: Record<string, unknown>) {
    const event: DomainEvent<T> = {
      type,
      timestamp: new Date(),
      payload,
      metadata,
    };

    logger.debug({ event }, 'Domain event emitted');

    const handlers = this.handlers.get(type) || [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  clear() {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
