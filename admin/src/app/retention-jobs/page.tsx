'use client';

import { useEffect, useState } from 'react';
import { api, RetentionJob } from '../../lib/api';

export default function RetentionJobsPage() {
  const [jobs, setJobs] = useState<RetentionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<RetentionJob | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadJobs();
  }, [filter]);

  async function loadJobs() {
    try {
      const data = await api.getRetentionJobs({
        status: filter || undefined,
        limit: 100,
      });
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading jobs...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Job History</h1>
        <p>View retention job execution history and logs</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Retention Jobs</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="form-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn btn-secondary" onClick={loadJobs}>
              Refresh
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">No jobs found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Affected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.rule?.name || job.ruleId}</strong>
                    {job.rule?.dataSource && (
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {job.rule.dataSource.name}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{new Date(job.startedAt).toLocaleString()}</td>
                  <td>
                    {job.finishedAt
                      ? formatDuration(
                          new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
                        )
                      : '-'}
                  </td>
                  <td>{job.affectedCount}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedJob(job)}
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h2 className="card-title">Job Details</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </div>

            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Job ID:</strong> {selectedJob.id}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Rule:</strong> {selectedJob.rule?.name}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Status:</strong>{' '}
                <span className={`badge badge-${getStatusColor(selectedJob.status)}`}>
                  {selectedJob.status}
                </span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Started:</strong> {new Date(selectedJob.startedAt).toLocaleString()}
              </div>
              {selectedJob.finishedAt && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Finished:</strong> {new Date(selectedJob.finishedAt).toLocaleString()}
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <strong>Affected Count:</strong> {selectedJob.affectedCount}
              </div>

              {selectedJob.errorMessage && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Error:</strong>
                  <div className="error">{selectedJob.errorMessage}</div>
                </div>
              )}

              {selectedJob.logText && (
                <div>
                  <strong>Logs:</strong>
                  <div className="code">{selectedJob.logText}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
