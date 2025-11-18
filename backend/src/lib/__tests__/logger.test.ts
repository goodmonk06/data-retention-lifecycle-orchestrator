import { describe, it, expect } from 'vitest';
import { createContextLogger } from '../logger.js';

describe('Logger', () => {
  it('should create context logger with metadata', () => {
    const contextLogger = createContextLogger({ service: 'test', requestId: '123' });
    expect(contextLogger).toBeDefined();
  });
});
