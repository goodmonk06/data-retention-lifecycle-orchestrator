export interface NotificationPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

export interface INotificationAdapter {
  send(payload: NotificationPayload): Promise<void>;
}

// In-memory stub implementation
export class InMemoryNotificationAdapter implements INotificationAdapter {
  private notifications: NotificationPayload[] = [];

  async send(payload: NotificationPayload): Promise<void> {
    this.notifications.push(payload);
    console.log(`[Notification] ${payload.severity.toUpperCase()}: ${payload.title}`);
  }

  getNotifications(): NotificationPayload[] {
    return this.notifications;
  }

  clear() {
    this.notifications = [];
  }
}

// Email adapter stub
export class EmailNotificationAdapter implements INotificationAdapter {
  constructor(private config: { from: string; smtpHost?: string }) {}

  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[Email] Would send: ${payload.title} from ${this.config.from}`);
    // In production, integrate with SendGrid, AWS SES, etc.
  }
}

// Webhook adapter stub
export class WebhookNotificationAdapter implements INotificationAdapter {
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[Webhook] Would POST to: ${this.webhookUrl}`);
    // In production, make HTTP POST to webhook URL
  }
}
