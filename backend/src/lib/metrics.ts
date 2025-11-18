import { logger } from './logger.js';

interface MetricLabels {
  [key: string]: string | number | boolean;
}

class MetricsService {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  recordCounter(name: string, value: number = 1, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    logger.debug({ metric: name, value, labels, type: 'counter' }, 'Metric recorded');
  }

  recordGauge(name: string, value: number, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
    logger.debug({ metric: name, value, labels, type: 'gauge' }, 'Metric recorded');
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    logger.debug({ metric: name, value, labels, type: 'histogram' }, 'Metric recorded');
  }

  recordDuration(name: string, durationMs: number, labels?: MetricLabels) {
    this.recordHistogram(`${name}_duration_ms`, durationMs, labels);
  }

  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
          },
        ])
      ),
    };
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private buildKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

export const metrics = new MetricsService();

// Metric names constants
export const METRICS = {
  RETENTION_JOB_STARTED: 'retention_job_started',
  RETENTION_JOB_COMPLETED: 'retention_job_completed',
  RETENTION_JOB_FAILED: 'retention_job_failed',
  RETENTION_JOB_DURATION: 'retention_job_duration',
  RECORDS_DELETED: 'records_deleted',
  RECORDS_ANONYMIZED: 'records_anonymized',
  RECORDS_ARCHIVED: 'records_archived',
  API_REQUEST: 'api_request',
  API_ERROR: 'api_error',
  CONNECTOR_ACTION: 'connector_action',
};
