import type { IConnector, ConnectorConfig, PostgresConfig } from './types.js';
import { PostgresConnector } from './postgres-connector.js';

export class ConnectorFactory {
  static create(configJson: string): IConnector {
    const config: ConnectorConfig = JSON.parse(configJson);

    switch (config.type) {
      case 'postgres':
        return new PostgresConnector(config as PostgresConfig);

      // Extensible for other connector types
      // case 'api':
      //   return new ApiConnector(config as ApiConfig);

      default:
        throw new Error(`Unsupported connector type: ${config.type}`);
    }
  }
}
