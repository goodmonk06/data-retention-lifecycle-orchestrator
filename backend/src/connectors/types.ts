export interface ConnectorConfig {
  type: string;
  [key: string]: any;
}

export interface PostgresConfig extends ConnectorConfig {
  type: 'postgres';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface RetentionFilter {
  table: string;
  dateColumn: string;
  additionalConditions?: string; // SQL WHERE clause
}

export interface RetentionResult {
  affectedCount: number;
  success: boolean;
  message?: string;
  error?: string;
}

export interface IConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeDelete(filter: RetentionFilter, ageDays: number): Promise<RetentionResult>;
  executeAnonymize(filter: RetentionFilter, ageDays: number, fieldsToAnonymize: string[]): Promise<RetentionResult>;
}
