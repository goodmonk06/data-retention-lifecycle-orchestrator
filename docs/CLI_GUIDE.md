# CLI Guide

The Data Retention Lifecycle Orchestrator includes a comprehensive CLI for operations, maintenance, and automation.

## Installation

The CLI is included in the backend package and can be run using:

```bash
# From project root
npm run cli -- <command>

# From backend directory
npm run cli <command>

# Or directly with tsx
tsx src/cli/index.ts <command>
```

## Commands

### Execute a Retention Rule

Execute a specific retention rule immediately:

```bash
npm run cli execute <ruleId>
```

**Example:**
```bash
npm run cli execute demo-delete-rule
```

**Use Cases:**
- Test a rule after creation
- Manual cleanup operations
- Scheduled via cron jobs
- Recovery operations

### Execute All Active Rules

Run all enabled retention rules:

```bash
npm run cli execute-all
```

**Example:**
```bash
npm run cli execute-all
```

**Use Cases:**
- Manual batch processing
- Cron job for overnight processing
- Recovery after system downtime
- Testing multiple rules

### List Retention Rules

View all retention rules in the system:

```bash
npm run cli list-rules [--enabled-only]
```

**Options:**
- `--enabled-only, -e` - Show only enabled rules

**Example:**
```bash
npm run cli list-rules
npm run cli list-rules --enabled-only
```

**Output:**
```
📋 Retention Rules:

  ID: demo-delete-rule
  Name: Delete old events (90 days)
  Data Source: Main Database
  Action: delete
  Age: 90 days
  Enabled: true
  Last Executed: 2024-11-18T10:30:00.000Z
```

### List Retention Policies

View all policy templates:

```bash
npm run cli list-policies
```

**Example:**
```bash
npm run cli list-policies
```

**Output:**
```
📋 Retention Policies:

  ID: gdpr-policy-123
  Name: GDPR Personal Data Retention
  Category: gdpr
  Rules using this policy: 3
```

### View Job Status

Get detailed status of a retention job:

```bash
npm run cli job-status <jobId>
```

**Example:**
```bash
npm run cli job-status job-abc-123
```

**Output:**
```
📊 Job Status:

  ID: job-abc-123
  Rule: Delete old events (90 days)
  Status: completed
  Started: 2024-11-18T10:30:00.000Z
  Finished: 2024-11-18T10:30:05.000Z
  Affected Count: 42
  Duration: 5234ms

  📝 Logs:

    [2024-11-18T10:30:00.000Z] Starting retention job job-abc-123
    Rule: Delete old events (90 days) (delete)
    Connected to data source: Main Database (postgres)
    Target: events, Date column: created_at, Age: 90 days
    ✓ Success: Deleted 42 rows from events
    Affected rows: 42
```

### Test Data Source Connection

Test connectivity to a data source:

```bash
npm run cli test-connection <dataSourceId>
```

**Example:**
```bash
npm run cli test-connection ds-main-db-123
```

**Output:**
```
🔌 Testing connection to: Main Database

  ✓ Connection successful
  ✓ Disconnected
```

**Use Cases:**
- Verify credentials after configuration changes
- Troubleshoot connection issues
- Health checks before rule execution
- Monitoring integrations

## Automation Examples

### Cron Job Integration

Add to your crontab:

```cron
# Execute all retention rules daily at 2 AM
0 2 * * * cd /app && npm run cli execute-all >> /var/log/retention.log 2>&1

# Test connections weekly
0 3 * * 0 cd /app && npm run cli test-connection ds-main >> /var/log/retention-health.log 2>&1
```

### Systemd Timer

Create `/etc/systemd/system/retention.service`:

```ini
[Unit]
Description=Data Retention Jobs
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/app
ExecStart=/usr/bin/npm run cli execute-all
User=retention
Environment="DATABASE_URL=postgresql://..."
```

Create `/etc/systemd/system/retention.timer`:

```ini
[Unit]
Description=Run retention jobs daily

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
systemctl enable retention.timer
systemctl start retention.timer
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retention-jobs
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: retention-cli
            image: retention-backend:latest
            command: ["npm", "run", "cli", "execute-all"]
            envFrom:
            - configMapRef:
                name: retention-config
            - secretRef:
                name: retention-secrets
          restartPolicy: OnFailure
```

### GitHub Actions

```yaml
name: Retention Jobs
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  retention:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run cli execute-all
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Exit Codes

- `0` - Success
- `1` - Error

Check exit code in scripts:

```bash
#!/bin/bash
npm run cli execute-all
if [ $? -eq 0 ]; then
  echo "Retention jobs completed successfully"
else
  echo "Retention jobs failed"
  exit 1
fi
```

## Logging

The CLI uses structured logging. Configure log level:

```bash
LOG_LEVEL=debug npm run cli list-rules
```

Redirect output:

```bash
npm run cli execute-all > retention.log 2>&1
```

## Best Practices

1. **Test First**: Use `job-status` to verify rule behavior before scheduling
2. **Start Small**: Begin with `--enabled-only` rules
3. **Monitor**: Always capture CLI output for audit purposes
4. **Dry Run**: Use dry-run mode on rules before production execution
5. **Notifications**: Configure notifications for critical rules
6. **Health Checks**: Regularly test connections
7. **Logging**: Maintain logs for compliance

## Troubleshooting

### Connection Failed

```bash
npm run cli test-connection <dataSourceId>
```

Check:
- DATABASE_URL environment variable
- Network connectivity
- Credentials validity
- Firewall rules

### Rule Execution Fails

```bash
npm run cli job-status <jobId>
```

Review:
- Error message in job logs
- Data source status
- Rule configuration
- Database permissions

### No Rules Found

```bash
npm run cli list-rules
```

Verify:
- Database connection
- Migrations ran successfully
- Seed data loaded

## See Also

- [API Documentation](./API.md)
- [Phase 3 Overview](./PHASE3_OVERVIEW.md)
- [README](../README.md)
