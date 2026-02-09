import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

// ============================================================
// Trigger Config Interfaces
// ============================================================

export interface KeywordTriggerConfig {
  keywords: string[];
  matchType: 'any' | 'all'; // any = OR, all = AND
  sources?: string[]; // module IDs to watch
}

export interface PriceThresholdConfig {
  ticker: string;
  condition: 'above' | 'below' | 'percent_change';
  value: number;
}

export interface RegulatoryFilingConfig {
  agencies?: string[];
  categories?: string[];
}

export interface LaunchStatusConfig {
  providers?: string[];
  statusChanges?: string[]; // e.g., ["go", "scrub", "success", "failure"]
}

export interface ContractAwardConfig {
  agencies?: string[];
  naicsCodes?: string[];
  minValue?: number;
  keywords?: string[];
}

export interface FundingRoundConfig {
  sectors?: string[];
  minAmount?: number;
  roundTypes?: string[];
}

export interface WeatherSeverityConfig {
  minKpIndex?: number;
  alertTypes?: string[];
}

export type TriggerConfig =
  | KeywordTriggerConfig
  | PriceThresholdConfig
  | RegulatoryFilingConfig
  | LaunchStatusConfig
  | ContractAwardConfig
  | FundingRoundConfig
  | WeatherSeverityConfig;

// ============================================================
// Trigger Type Constants
// ============================================================

export const TRIGGER_TYPES = [
  'keyword',
  'price_threshold',
  'regulatory_filing',
  'launch_status',
  'contract_award',
  'funding_round',
  'weather_severity',
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number];

// ============================================================
// Individual Trigger Matchers
// ============================================================

export function matchKeywordTrigger(
  config: KeywordTriggerConfig,
  data: { title?: string; content?: string }
): boolean {
  const searchText = `${data.title || ''} ${data.content || ''}`.toLowerCase();

  if (!searchText.trim()) return false;

  const keywords = config.keywords.map((k) => k.toLowerCase());

  if (config.matchType === 'all') {
    return keywords.every((keyword) => searchText.includes(keyword));
  }

  // matchType === 'any' (OR)
  return keywords.some((keyword) => searchText.includes(keyword));
}

export function matchPriceThreshold(
  config: PriceThresholdConfig,
  data: { ticker: string; price: number; change: number }
): boolean {
  if (config.ticker.toLowerCase() !== data.ticker.toLowerCase()) {
    return false;
  }

  switch (config.condition) {
    case 'above':
      return data.price >= config.value;
    case 'below':
      return data.price <= config.value;
    case 'percent_change':
      return Math.abs(data.change) >= config.value;
    default:
      return false;
  }
}

export function matchRegulatoryFiling(
  config: RegulatoryFilingConfig,
  data: { agency: string; category: string }
): boolean {
  const agencyMatch =
    !config.agencies ||
    config.agencies.length === 0 ||
    config.agencies.some((a) => a.toLowerCase() === data.agency.toLowerCase());

  const categoryMatch =
    !config.categories ||
    config.categories.length === 0 ||
    config.categories.some((c) => c.toLowerCase() === data.category.toLowerCase());

  return agencyMatch && categoryMatch;
}

export function matchLaunchStatus(
  config: LaunchStatusConfig,
  data: { provider: string; status: string }
): boolean {
  const providerMatch =
    !config.providers ||
    config.providers.length === 0 ||
    config.providers.some((p) => data.provider.toLowerCase().includes(p.toLowerCase()));

  const statusMatch =
    !config.statusChanges ||
    config.statusChanges.length === 0 ||
    config.statusChanges.some((s) => s.toLowerCase() === data.status.toLowerCase());

  return providerMatch && statusMatch;
}

export function matchContractAward(
  config: ContractAwardConfig,
  data: { agency: string; naicsCode: string; value: number; title: string }
): boolean {
  const agencyMatch =
    !config.agencies ||
    config.agencies.length === 0 ||
    config.agencies.some((a) => a.toLowerCase() === data.agency.toLowerCase());

  const naicsMatch =
    !config.naicsCodes ||
    config.naicsCodes.length === 0 ||
    config.naicsCodes.some((n) => data.naicsCode.startsWith(n));

  const valueMatch = !config.minValue || data.value >= config.minValue;

  const keywordMatch =
    !config.keywords ||
    config.keywords.length === 0 ||
    config.keywords.some((k) => data.title.toLowerCase().includes(k.toLowerCase()));

  return agencyMatch && naicsMatch && valueMatch && keywordMatch;
}

export function matchFundingRound(
  config: FundingRoundConfig,
  data: { sector: string; amount: number; roundType: string }
): boolean {
  const sectorMatch =
    !config.sectors ||
    config.sectors.length === 0 ||
    config.sectors.some((s) => s.toLowerCase() === data.sector.toLowerCase());

  const amountMatch = !config.minAmount || data.amount >= config.minAmount;

  const roundMatch =
    !config.roundTypes ||
    config.roundTypes.length === 0 ||
    config.roundTypes.some((r) => r.toLowerCase() === data.roundType.toLowerCase());

  return sectorMatch && amountMatch && roundMatch;
}

export function matchWeatherSeverity(
  config: WeatherSeverityConfig,
  data: { kpIndex: number; alertType: string }
): boolean {
  const kpMatch = !config.minKpIndex || data.kpIndex >= config.minKpIndex;

  const alertMatch =
    !config.alertTypes ||
    config.alertTypes.length === 0 ||
    config.alertTypes.some((a) => a.toLowerCase() === data.alertType.toLowerCase());

  return kpMatch && alertMatch;
}

// ============================================================
// Matcher Dispatch
// ============================================================

function matchTrigger(
  triggerType: string,
  triggerConfig: TriggerConfig,
  data: Record<string, unknown>
): boolean {
  switch (triggerType) {
    case 'keyword':
      return matchKeywordTrigger(
        triggerConfig as KeywordTriggerConfig,
        data as { title?: string; content?: string }
      );
    case 'price_threshold':
      return matchPriceThreshold(
        triggerConfig as PriceThresholdConfig,
        data as { ticker: string; price: number; change: number }
      );
    case 'regulatory_filing':
      return matchRegulatoryFiling(
        triggerConfig as RegulatoryFilingConfig,
        data as { agency: string; category: string }
      );
    case 'launch_status':
      return matchLaunchStatus(
        triggerConfig as LaunchStatusConfig,
        data as { provider: string; status: string }
      );
    case 'contract_award':
      return matchContractAward(
        triggerConfig as ContractAwardConfig,
        data as { agency: string; naicsCode: string; value: number; title: string }
      );
    case 'funding_round':
      return matchFundingRound(
        triggerConfig as FundingRoundConfig,
        data as { sector: string; amount: number; roundType: string }
      );
    case 'weather_severity':
      return matchWeatherSeverity(
        triggerConfig as WeatherSeverityConfig,
        data as { kpIndex: number; alertType: string }
      );
    default:
      logger.warn('Unknown trigger type in matchTrigger', { triggerType });
      return false;
  }
}

// ============================================================
// Generate Alert Title/Message
// ============================================================

function generateAlertContent(
  triggerType: string,
  ruleName: string,
  data: Record<string, unknown>
): { title: string; message: string } {
  switch (triggerType) {
    case 'keyword':
      return {
        title: `Keyword Alert: ${ruleName}`,
        message: `Your keyword alert "${ruleName}" matched: ${(data.title as string) || 'New content detected'}`,
      };
    case 'price_threshold':
      return {
        title: `Price Alert: ${data.ticker || ruleName}`,
        message: `${data.ticker} is now at $${data.price} (${Number(data.change) > 0 ? '+' : ''}${data.change}%)`,
      };
    case 'regulatory_filing':
      return {
        title: `Regulatory Filing: ${data.agency || 'New Filing'}`,
        message: `New regulatory filing from ${data.agency}: ${(data.title as string) || (data.category as string) || 'See details'}`,
      };
    case 'launch_status':
      return {
        title: `Launch Status Update: ${data.provider || 'Launch Event'}`,
        message: `${data.provider} launch status changed to "${data.status}"${data.missionName ? ` - ${data.missionName}` : ''}`,
      };
    case 'contract_award':
      return {
        title: `Contract Alert: ${data.agency || 'New Contract'}`,
        message: `New contract from ${data.agency}: ${(data.title as string) || 'See details'}${data.value ? ` ($${data.value}M)` : ''}`,
      };
    case 'funding_round':
      return {
        title: `Funding Alert: ${data.company || ruleName}`,
        message: `${data.company || 'A company'} raised $${data.amount}M in a ${data.roundType} round (${data.sector})`,
      };
    case 'weather_severity':
      return {
        title: `Space Weather Alert: ${data.alertType || 'Geomagnetic Activity'}`,
        message: `Space weather alert: ${data.alertType || 'Activity detected'} (Kp Index: ${data.kpIndex})`,
      };
    default:
      return {
        title: `Alert: ${ruleName}`,
        message: `Alert rule "${ruleName}" triggered`,
      };
  }
}

// ============================================================
// Main Processing Engine
// ============================================================

/**
 * Process all active alert rules against new data.
 * @param triggerType - The type of trigger event
 * @param data - The event data to match against
 * @param prisma - Prisma client instance
 * @returns The number of alerts triggered
 */
export async function processAlerts(
  triggerType: string,
  data: Record<string, unknown>,
  prisma: PrismaClient
): Promise<number> {
  let triggeredCount = 0;

  try {
    // 1. Get all active rules for this trigger type
    const activeRules = await prisma.alertRule.findMany({
      where: {
        triggerType,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        triggerConfig: true,
        channels: true,
        priority: true,
        lastTriggeredAt: true,
        cooldownMinutes: true,
      },
    });

    if (activeRules.length === 0) {
      logger.debug('No active alert rules for trigger type', { triggerType });
      return 0;
    }

    logger.info('Processing alert rules', {
      triggerType,
      ruleCount: activeRules.length,
    });

    const now = new Date();

    for (const rule of activeRules) {
      try {
        // 2. Check cooldown (lastTriggeredAt + cooldownMinutes > now? skip)
        if (rule.lastTriggeredAt) {
          const cooldownEnd = new Date(
            rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000
          );
          if (now < cooldownEnd) {
            logger.debug('Alert rule in cooldown, skipping', {
              ruleId: rule.id,
              cooldownEnd: cooldownEnd.toISOString(),
            });
            continue;
          }
        }

        // 3. Check if data matches the trigger config
        const config = rule.triggerConfig as TriggerConfig;
        const matched = matchTrigger(triggerType, config, data);

        if (!matched) {
          continue;
        }

        // 4. Create AlertHistory record
        await prisma.alertHistory.create({
          data: {
            alertRuleId: rule.id,
            userId: rule.userId,
            triggerType,
            triggerData: data as unknown as Record<string, string | number | boolean | null>,
          },
        });

        // 5. Generate alert content
        const { title, message } = generateAlertContent(triggerType, rule.name, data);

        // 6. Create AlertDelivery records for each channel
        const deliveryRecords = rule.channels.map((channel: string) => ({
          alertRuleId: rule.id,
          userId: rule.userId,
          channel,
          status: 'pending',
          title,
          message,
          data: {
            triggerType,
            priority: rule.priority,
            ...data,
          },
        }));

        if (deliveryRecords.length > 0) {
          await prisma.alertDelivery.createMany({
            data: deliveryRecords,
          });
        }

        // 7. Update the rule's lastTriggeredAt and increment triggerCount
        await prisma.alertRule.update({
          where: { id: rule.id },
          data: {
            lastTriggeredAt: now,
            triggerCount: { increment: 1 },
          },
        });

        triggeredCount++;

        logger.info('Alert rule triggered', {
          ruleId: rule.id,
          userId: rule.userId,
          triggerType,
          channels: rule.channels,
          priority: rule.priority,
        });
      } catch (ruleError) {
        logger.error('Error processing individual alert rule', {
          ruleId: rule.id,
          error: ruleError instanceof Error ? ruleError.message : String(ruleError),
        });
      }
    }

    logger.info('Alert processing complete', {
      triggerType,
      rulesEvaluated: activeRules.length,
      triggered: triggeredCount,
    });
  } catch (error) {
    logger.error('Error in processAlerts', {
      triggerType,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return triggeredCount;
}
