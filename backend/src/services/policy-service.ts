import { prisma } from '../db.js';
import { logger } from '../lib/logger.js';
import { auditService } from './audit-service.js';

export interface PolicyTemplate {
  action: 'delete' | 'anonymize' | 'archive';
  ageDays: number;
  filterTemplate: {
    table?: string;
    dateColumn: string;
    fieldsToAnonymize?: string[];
  };
  scheduleType?: string;
}

export class PolicyService {
  async createPolicy(data: {
    name: string;
    description?: string;
    category?: string;
    template: PolicyTemplate;
    tags?: string[];
  }) {
    const policy = await prisma.retentionPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || 'general',
        templateJson: JSON.stringify(data.template),
        tags: data.tags || [],
      },
    });

    await auditService.log({
      entityType: 'retention_policy',
      entityId: policy.id,
      action: 'created',
      metadata: { name: data.name },
    });

    logger.info({ policyId: policy.id, name: data.name }, 'Retention policy created');
    return policy;
  }

  async applyPolicyToDataSource(policyId: string, dataSourceId: string, customization?: Partial<PolicyTemplate>) {
    const policy = await prisma.retentionPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const template: PolicyTemplate = JSON.parse(policy.templateJson);
    const merged = { ...template, ...customization };

    const rule = await prisma.retentionRule.create({
      data: {
        dataSourceId,
        policyId,
        name: `${policy.name} - Auto-generated`,
        description: policy.description,
        action: merged.action,
        ageDays: merged.ageDays,
        filterJson: JSON.stringify(merged.filterTemplate),
        scheduleType: merged.scheduleType || 'daily',
      },
    });

    logger.info(
      { ruleId: rule.id, policyId, dataSourceId },
      'Policy applied to data source'
    );

    return rule;
  }

  async getPolicies() {
    return await prisma.retentionPolicy.findMany({
      include: {
        _count: {
          select: { retentionRules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPolicy(id: string) {
    return await prisma.retentionPolicy.findUnique({
      where: { id },
      include: {
        retentionRules: {
          include: {
            dataSource: true,
          },
        },
      },
    });
  }
}

export const policyService = new PolicyService();
