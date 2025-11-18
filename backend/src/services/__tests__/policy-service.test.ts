import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyService } from '../policy-service.js';

describe('PolicyService', () => {
  const policyService = new PolicyService();

  describe('createPolicy', () => {
    it('should create a policy with valid template', async () => {
      const policyData = {
        name: `Test GDPR Policy ${Date.now()}`,
        description: 'Delete PII after 90 days',
        category: 'gdpr' as const,
        template: {
          action: 'delete' as const,
          ageDays: 90,
          filterTemplate: {
            dateColumn: 'created_at',
          },
        },
        tags: ['gdpr', 'privacy'],
      };

      const policy = await policyService.createPolicy(policyData);

      expect(policy).toBeDefined();
      expect(policy.name).toBe(policyData.name);
      expect(policy.category).toBe('gdpr');
      expect(policy.tags).toEqual(['gdpr', 'privacy']);
    });

    it('should parse template JSON correctly', async () => {
      const policyData = {
        name: `Test Anonymize Policy ${Date.now()}`,
        template: {
          action: 'anonymize' as const,
          ageDays: 30,
          filterTemplate: {
            dateColumn: 'created_at',
            fieldsToAnonymize: ['email', 'phone'],
          },
        },
      };

      const policy = await policyService.createPolicy(policyData);
      const template = JSON.parse(policy.templateJson);

      expect(template.action).toBe('anonymize');
      expect(template.filterTemplate.fieldsToAnonymize).toEqual(['email', 'phone']);
    });
  });
});
