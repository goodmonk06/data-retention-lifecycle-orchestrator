const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  configJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionRule {
  id: string;
  dataSourceId: string;
  dataSource?: DataSource;
  name: string;
  description?: string;
  action: 'delete' | 'anonymize' | 'archive';
  ageDays: number;
  filterJson: string;
  enabled: boolean;
  scheduleType: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionJob {
  id: string;
  ruleId: string;
  rule?: RetentionRule;
  startedAt: string;
  finishedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  affectedCount: number;
  logText?: string;
  errorMessage?: string;
  createdAt: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Data Sources
  async getDataSources(): Promise<DataSource[]> {
    return this.fetch('/api/data-sources');
  }

  async getDataSource(id: string): Promise<DataSource> {
    return this.fetch(`/api/data-sources/${id}`);
  }

  async createDataSource(data: Partial<DataSource>): Promise<DataSource> {
    return this.fetch('/api/data-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDataSource(id: string, data: Partial<DataSource>): Promise<DataSource> {
    return this.fetch(`/api/data-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDataSource(id: string): Promise<void> {
    return this.fetch(`/api/data-sources/${id}`, {
      method: 'DELETE',
    });
  }

  // Retention Rules
  async getRetentionRules(): Promise<RetentionRule[]> {
    return this.fetch('/api/retention-rules');
  }

  async getRetentionRule(id: string): Promise<RetentionRule> {
    return this.fetch(`/api/retention-rules/${id}`);
  }

  async createRetentionRule(data: Partial<RetentionRule>): Promise<RetentionRule> {
    return this.fetch('/api/retention-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRetentionRule(id: string, data: Partial<RetentionRule>): Promise<RetentionRule> {
    return this.fetch(`/api/retention-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRetentionRule(id: string): Promise<void> {
    return this.fetch(`/api/retention-rules/${id}`, {
      method: 'DELETE',
    });
  }

  async executeRetentionRule(id: string): Promise<{ message: string; ruleId: string }> {
    return this.fetch(`/api/retention-rules/${id}/execute`, {
      method: 'POST',
    });
  }

  // Retention Jobs
  async getRetentionJobs(params?: { ruleId?: string; status?: string; limit?: number }): Promise<RetentionJob[]> {
    const query = new URLSearchParams();
    if (params?.ruleId) query.append('ruleId', params.ruleId);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.fetch(`/api/retention-jobs${queryString}`);
  }

  async getRetentionJob(id: string): Promise<RetentionJob> {
    return this.fetch(`/api/retention-jobs/${id}`);
  }

  async getRetentionJobStats(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    runningJobs: number;
    totalRecordsAffected: number;
  }> {
    return this.fetch('/api/retention-jobs/stats/summary');
  }
}

export const api = new ApiClient(API_URL);
