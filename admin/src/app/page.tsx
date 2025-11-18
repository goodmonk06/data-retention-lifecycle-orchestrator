'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, jobsData] = await Promise.all([
        api.getRetentionJobStats(),
        api.getRetentionJobs({ limit: 5 }),
      ]);
      setStats(statsData);
      setRecentJobs(jobsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your data retention operations</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Jobs</div>
            <div className="stat-value">{stats.totalJobs}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: '#27ae60' }}>
              {stats.completedJobs}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value" style={{ color: '#e74c3c' }}>
              {stats.failedJobs}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Running</div>
            <div className="stat-value" style={{ color: '#3498db' }}>
              {stats.runningJobs}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Records Affected</div>
            <div className="stat-value">{stats.totalRecordsAffected.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Jobs</h2>
          <Link href="/retention-jobs" className="btn btn-primary btn-sm">
            View All
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="empty-state">No jobs executed yet</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
                <th>Started</th>
                <th>Affected</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.rule?.name || job.ruleId}</td>
                  <td>
                    <span className={`badge badge-${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{new Date(job.startedAt).toLocaleString()}</td>
                  <td>{job.affectedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Links</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/data-sources" className="btn btn-primary">
            Manage Data Sources
          </Link>
          <Link href="/retention-rules" className="btn btn-primary">
            Manage Rules
          </Link>
          <Link href="/retention-jobs" className="btn btn-secondary">
            View Job History
          </Link>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'info';
    default:
      return 'secondary';
  }
}
