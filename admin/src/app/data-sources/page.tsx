'use client';

import { useEffect, useState } from 'react';
import { api, DataSource } from '../../lib/api';

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'postgres',
    description: '',
    configJson: JSON.stringify(
      {
        type: 'postgres',
        host: 'postgres',
        port: 5432,
        database: 'retention_db',
        user: 'postgres',
        password: 'postgres',
      },
      null,
      2
    ),
  });

  useEffect(() => {
    loadDataSources();
  }, []);

  async function loadDataSources() {
    try {
      const data = await api.getDataSources();
      setDataSources(data);
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingId) {
        await api.updateDataSource(editingId, formData);
      } else {
        await api.createDataSource(formData);
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadDataSources();
    } catch (error) {
      alert(`Failed to save: ${error}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this data source?')) {
      return;
    }

    try {
      await api.deleteDataSource(id);
      loadDataSources();
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    }
  }

  function handleEdit(ds: DataSource) {
    setFormData({
      name: ds.name,
      type: ds.type,
      description: ds.description || '',
      configJson: JSON.stringify(JSON.parse(ds.configJson), null, 2),
    });
    setEditingId(ds.id);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      type: 'postgres',
      description: '',
      configJson: JSON.stringify(
        {
          type: 'postgres',
          host: 'postgres',
          port: 5432,
          database: 'retention_db',
          user: 'postgres',
          password: 'postgres',
        },
        null,
        2
      ),
    });
  }

  if (loading) {
    return <div className="loading">Loading data sources...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Data Sources</h1>
        <p>Manage database connections and data sources</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Data Sources</h2>
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
            {showForm ? 'Cancel' : '+ Add Data Source'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
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
              <label className="form-label">Type *</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="postgres">PostgreSQL</option>
                <option value="api">API</option>
              </select>
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
              <label className="form-label">Configuration JSON *</label>
              <textarea
                className="form-textarea"
                value={formData.configJson}
                onChange={(e) => setFormData({ ...formData, configJson: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-success">
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        )}

        {dataSources.length === 0 ? (
          <div className="empty-state">
            No data sources configured yet. Add one to get started!
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((ds) => (
                <tr key={ds.id}>
                  <td><strong>{ds.name}</strong></td>
                  <td><span className="badge badge-info">{ds.type}</span></td>
                  <td>{ds.description || '-'}</td>
                  <td>{new Date(ds.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(ds)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ds.id)}>
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
