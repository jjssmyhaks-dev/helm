import { Injectable, NotFoundException } from '@nestjs/common';
import { RiskTier } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface LayerAutonomy {
  tier: RiskTier;
  enabled: boolean;
}

export interface AutonomySettings {
  RESEARCH: LayerAutonomy;
  MARKETING: LayerAutonomy;
  OPERATIONS: LayerAutonomy;
  FINANCE: LayerAutonomy;
}

const DEFAULT_SETTINGS: AutonomySettings = {
  RESEARCH: { tier: RiskTier.AUTO_EXECUTE, enabled: true },
  MARKETING: { tier: RiskTier.NOTIFY_AND_ACT, enabled: true },
  OPERATIONS: { tier: RiskTier.NOTIFY_AND_ACT, enabled: true },
  FINANCE: { tier: RiskTier.APPROVAL_REQUIRED, enabled: true },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAutonomySettings(founderId: string): Promise<AutonomySettings> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    if (!founder) throw new NotFoundException('Founder not found');

    const stored = (founder as any).autonomySettings;
    if (!stored || Object.keys(stored).length === 0) {
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...stored } as AutonomySettings;
  }

  async updateAutonomySettings(
    founderId: string,
    settings: Partial<AutonomySettings>,
  ): Promise<AutonomySettings> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    if (!founder) throw new NotFoundException('Founder not found');

    const current = (founder as any).autonomySettings || {};
    const merged = { ...DEFAULT_SETTINGS, ...current, ...settings };

    // Validate tiers
    for (const [layer, config] of Object.entries(merged)) {
      if (!['RESEARCH', 'MARKETING', 'OPERATIONS', 'FINANCE'].includes(layer)) {
        delete (merged as any)[layer];
        continue;
      }
      const c = config as LayerAutonomy;
      if (!['AUTO_EXECUTE', 'NOTIFY_AND_ACT', 'APPROVAL_REQUIRED'].includes(c.tier)) {
        c.tier = RiskTier.NOTIFY_AND_ACT;
      }
    }

    await this.prisma.founder.update({
      where: { id: founderId },
      data: { autonomySettings: merged as any },
    });

    return merged as AutonomySettings;
  }

  /**
   * Get the tier for a specific layer — used by RiskTierService
   */
  async getLayerTier(founderId: string, layer: string): Promise<RiskTier> {
    const settings = await this.getAutonomySettings(founderId);
    const layerSetting = settings[layer as keyof AutonomySettings];
    if (!layerSetting?.enabled) return RiskTier.APPROVAL_REQUIRED;
    return layerSetting.tier;
  }
}
