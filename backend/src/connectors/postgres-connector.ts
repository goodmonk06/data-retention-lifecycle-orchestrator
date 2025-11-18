import pg from 'pg';
import type { IConnector, PostgresConfig, RetentionFilter, RetentionResult } from './types.js';

const { Client } = pg;

export class PostgresConnector implements IConnector {
  private client: pg.Client | null = null;
  private config: PostgresConfig;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async executeDelete(filter: RetentionFilter, ageDays: number): Promise<RetentionResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const whereClause = this.buildWhereClause(filter, ageDays);
      const query = `DELETE FROM ${filter.table} WHERE ${whereClause}`;

      console.log(`Executing DELETE: ${query}`);
      const result = await this.client.query(query);

      return {
        affectedCount: result.rowCount || 0,
        success: true,
        message: `Deleted ${result.rowCount || 0} rows from ${filter.table}`,
      };
    } catch (error) {
      console.error('Delete operation failed:', error);
      return {
        affectedCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async executeAnonymize(
    filter: RetentionFilter,
    ageDays: number,
    fieldsToAnonymize: string[]
  ): Promise<RetentionResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const whereClause = this.buildWhereClause(filter, ageDays);
      const setClause = fieldsToAnonymize.map(field => `${field} = NULL`).join(', ');
      const query = `UPDATE ${filter.table} SET ${setClause} WHERE ${whereClause}`;

      console.log(`Executing ANONYMIZE: ${query}`);
      const result = await this.client.query(query);

      return {
        affectedCount: result.rowCount || 0,
        success: true,
        message: `Anonymized ${result.rowCount || 0} rows in ${filter.table}`,
      };
    } catch (error) {
      console.error('Anonymize operation failed:', error);
      return {
        affectedCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildWhereClause(filter: RetentionFilter, ageDays: number): string {
    const ageCondition = `${filter.dateColumn} < NOW() - INTERVAL '${ageDays} days'`;

    if (filter.additionalConditions) {
      return `${ageCondition} AND (${filter.additionalConditions})`;
    }

    return ageCondition;
  }
}
