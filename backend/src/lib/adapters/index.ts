import { INotificationAdapter, InMemoryNotificationAdapter } from './notification-adapter.js';
import { IStorageAdapter, InMemoryStorageAdapter } from './storage-adapter.js';

export * from './notification-adapter.js';
export * from './storage-adapter.js';

// Global adapter registry
class AdapterRegistry {
  private notificationAdapter: INotificationAdapter = new InMemoryNotificationAdapter();
  private storageAdapter: IStorageAdapter = new InMemoryStorageAdapter();

  setNotificationAdapter(adapter: INotificationAdapter) {
    this.notificationAdapter = adapter;
  }

  setStorageAdapter(adapter: IStorageAdapter) {
    this.storageAdapter = adapter;
  }

  getNotificationAdapter(): INotificationAdapter {
    return this.notificationAdapter;
  }

  getStorageAdapter(): IStorageAdapter {
    return this.storageAdapter;
  }
}

export const adapters = new AdapterRegistry();
