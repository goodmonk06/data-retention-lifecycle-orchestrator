'use client';

import { useEffect, useState } from 'react';
import { api, RetentionRule, DataSource } from '../../lib/api';

export default function RetentionRulesPage() {
  const [rules, setRules] = useState<RetentionRule[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    dataSourceId: '',
    name: '',
    description: '',
    action: 'delete' as 'delete' | 'anonymize' | 'archive',
    ageDays: 90,
    enabled: true,
    scheduleType: 'daily' as 'daily' | 'weekly' | 'monthly',
    filterJson: JSON.stringify(
      {
        table: 'events',
        dateColumn: 'created_at',
      },
      null,
      2
    ),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rulesData, dataSourcesData] = await Promise.all([
        api.getRetentionRules(),
        api.getDataSources(),
      ]);
      setRules(rulesData);
      setDataSources(dataSourcesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingId) {
        await api.updateRetentionRule(editingId, formData);
      } else {
        await api.createRetentionRule(formData);
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      alert(`Failed to save: ${error}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this retention rule?')) {
      return;
    }

    try {
      await api.deleteRetentionRule(id);
      loadData();
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    }
  }

  async function handleExecute(id: string, name: string) {
    if (!confirm(`Execute retention rule "${name}" now?`)) {
      return;
    }

    try {
      await api.executeRetentionRule(id);
      alert('Retention job scheduled successfully!');
    } catch (error) {
      alert(`Failed to execute: ${error}`);
    }
  }

  function handleEdit(rule: RetentionRule) {
    setFormData({
      dataSourceId: rule.dataSourceId,
      name: rule.name,
      description: rule.description || '',
      action: rule.action,
      ageDays: rule.ageDays,
      enabled: rule.enabled,
      scheduleType: rule.scheduleType as any,
      filterJson: JSON.stringify(JSON.parse(rule.filterJson), null, 2),
    });
    setEditingId(rule.id);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      dataSourceId: '',
      name: '',
      description: '',
      action: 'delete',
      ageDays: 90,
      enabled: true,
      scheduleType: 'daily',
      filterJson: JSON.stringify(
        {
          table: 'events',
          dateColumn: 'created_at',
        },
        null,
        2
      ),
    });
  }

  if (loading) {
    return <div className="loading">Loading retention rules...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Retention Rules</h1>
        <p>Define data retention policies and automated actions</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Retention Rules</h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                resetForm();
              }
            }}
          >
            {showForm ? 'Cancel' : '+ Add Rule'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <div className="form-group">
              <label className="form-label">Data Source *</label>
              <select
                className="form-select"
                value={formData.dataSourceId}
                onChange={(e) => setFormData({ ...formData, dataSourceId: e.target.value })}
                required
              >
                <option value="">Select a data source</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Action *</label>
              <select
                className="form-select"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                required
              >
                <option value="delete">Delete</option>
                <option value="anonymize">Anonymize</option>
                <option value="archive">Archive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Age (Days) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.ageDays}
                onChange={(e) => setFormData({ ...formData, ageDays: parseInt(e.target.value) })}
                required
                min="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Filter JSON *</label>
              <textarea
                className="form-textarea"
                value={formData.filterJson}
                onChange={(e) => setFormData({ ...formData, filterJson: e.target.value })}
                required
              />
              <small style={{ color: '#666' }}>
                For delete: {`{"table": "...", "dateColumn": "..."}`}<br />
                For anonymize: {`{"table": "...", "dateColumn": "...", "fieldsToAnonymize": ["field1", "field2"]}`}
              </small>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
            </div>

            <button type="submit" className="btn btn-success">
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        )}

        {rules.length === 0 ? (
          <div className="empty-state">
            No retention rules configured yet. Add one to get started!
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Data Source</th>
                <th>Action</th>
                <th>Age</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.name}</strong>
                    {rule.description && (
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {rule.description}
                      </div>
                    )}
                  </td>
                  <td>{rule.dataSource?.name || rule.dataSourceId}</td>
                  <td>
                    <span className={`badge badge-${getActionColor(rule.action)}`}>
                      {rule.action}
                    </span>
                  </td>
                  <td>{rule.ageDays} days</td>
                  <td>
                    <span className={`badge badge-${rule.enabled ? 'success' : 'secondary'}`}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-success btn-sm" onClick={() => handleExecute(rule.id, rule.name)}>
                        Execute
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(rule)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rule.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getActionColor(action: string): string {
  switch (action) {
    case 'delete':
      return 'danger';
    case 'anonymize':
      return 'warning';
    case 'archive':
      return 'info';
    default:
      return 'secondary';
  }
}
