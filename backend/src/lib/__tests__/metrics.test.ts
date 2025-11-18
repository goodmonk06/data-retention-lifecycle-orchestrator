import { describe, it, expect, beforeEach } from 'vitest';
import { metrics, METRICS } from '../metrics.js';

describe('Metrics Service', () => {
  beforeEach(() => {
    metrics.reset();
  });

  it('should record counter metrics', () => {
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 1);
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 2);

    const allMetrics = metrics.getMetrics();
    expect(allMetrics.counters[METRICS.RETENTION_JOB_STARTED]).toBe(3);
  });

  it('should record gauge metrics', () => {
    metrics.recordGauge('active_jobs', 5);
    metrics.recordGauge('active_jobs', 10);

    const allMetrics = metrics.getMetrics();
    expect(allMetrics.gauges['active_jobs']).toBe(10);
  });

  it('should record histogram metrics', () => {
    metrics.recordHistogram('request_duration', 100);
    metrics.recordHistogram('request_duration', 200);
    metrics.recordHistogram('request_duration', 300);

    const allMetrics = metrics.getMetrics();
    const histogram = allMetrics.histograms['request_duration'];

    expect(histogram.count).toBe(3);
    expect(histogram.sum).toBe(600);
    expect(histogram.avg).toBe(200);
    expect(histogram.min).toBe(100);
    expect(histogram.max).toBe(300);
  });

  it('should record metrics with labels', () => {
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 1, { action: 'delete' });
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 1, { action: 'anonymize' });

    const allMetrics = metrics.getMetrics();
    expect(allMetrics.counters[`${METRICS.RETENTION_JOB_STARTED}{action=delete}`]).toBe(1);
    expect(allMetrics.counters[`${METRICS.RETENTION_JOB_STARTED}{action=anonymize}`]).toBe(1);
  });

  it('should reset all metrics', () => {
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 5);
    metrics.recordGauge('active_jobs', 10);

    metrics.reset();

    const allMetrics = metrics.getMetrics();
    expect(Object.keys(allMetrics.counters).length).toBe(0);
    expect(Object.keys(allMetrics.gauges).length).toBe(0);
  });
});
