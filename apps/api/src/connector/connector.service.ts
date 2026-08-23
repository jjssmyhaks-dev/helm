import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ConnectorAuthStatus as AuthStatus, AuthType, LayerName } from '@prisma/client';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CONNECTOR_ENCRYPTION_KEY || 'helm-dev-key-change-in-prod-32b!';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/** Default connector catalog — can be extended via manifest JSON */
const CONNECTOR_CATALOG = [
  { name: 'web-search', displayName: 'Web Search', description: 'Market/competitor scanning', authType: AuthType.API_KEY, endpoint: 'mcp://web-search', layers: ['RESEARCH'] as LayerName[] },
  { name: 'news-rss', displayName: 'News/RSS', description: 'Trend monitoring', authType: AuthType.API_KEY, endpoint: 'mcp://news-rss', layers: ['RESEARCH'] as LayerName[] },
  { name: 'figma', displayName: 'Figma', description: 'Design asset access', authType: AuthType.OAUTH, endpoint: 'mcp://figma', layers: ['MARKETING'] as LayerName[] },
  { name: 'meta-ads', displayName: 'Meta Ads', description: 'Campaign management', authType: AuthType.OAUTH, endpoint: 'mcp://meta-ads', layers: ['MARKETING'] as LayerName[] },
  { name: 'google-ads', displayName: 'Google Ads', description: 'Campaign management', authType: AuthType.OAUTH, endpoint: 'mcp://google-ads', layers: ['MARKETING'] as LayerName[] },
  { name: 'canva', displayName: 'Canva', description: 'Creative generation', authType: AuthType.OAUTH, endpoint: 'mcp://canva', layers: ['MARKETING'] as LayerName[] },
  { name: 'instagram', displayName: 'Instagram', description: 'Social posting', authType: AuthType.OAUTH, endpoint: 'mcp://instagram', layers: ['MARKETING'] as LayerName[] },
  { name: 'linkedin', displayName: 'LinkedIn', description: 'Social posting', authType: AuthType.OAUTH, endpoint: 'mcp://linkedin', layers: ['MARKETING'] as LayerName[] },
  { name: 'whatsapp', displayName: 'WhatsApp Business', description: 'Customer/vendor comms', authType: AuthType.OAUTH, endpoint: 'mcp://whatsapp', layers: ['OPERATIONS'] as LayerName[] },
  { name: 'slack', displayName: 'Slack', description: 'Internal notifications', authType: AuthType.OAUTH, endpoint: 'mcp://slack', layers: ['OPERATIONS'] as LayerName[] },
  { name: 'google-sheets', displayName: 'Google Sheets', description: 'Inventory/tracking', authType: AuthType.OAUTH, endpoint: 'mcp://google-sheets', layers: ['OPERATIONS'] as LayerName[] },
  { name: 'tally', displayName: 'Tally', description: 'Bookkeeping sync', authType: AuthType.API_KEY, endpoint: 'mcp://tally', layers: ['FINANCE'] as LayerName[] },
  { name: 'banking', displayName: 'Banking API', description: 'Transaction feed, payments', authType: AuthType.API_KEY, endpoint: 'mcp://banking', layers: ['FINANCE'] as LayerName[] },
  { name: 'gst-portal', displayName: 'GST Portal', description: 'Compliance filing status', authType: AuthType.API_KEY, endpoint: 'mcp://gst-portal', layers: ['FINANCE'] as LayerName[] },
  { name: 'gmail', displayName: 'Gmail/Outlook', description: 'Email drafting and sending', authType: AuthType.OAUTH, endpoint: 'mcp://gmail', layers: ['RESEARCH', 'MARKETING', 'OPERATIONS', 'FINANCE'] as LayerName[] },
  { name: 'google-calendar', displayName: 'Google Calendar', description: 'Scheduling', authType: AuthType.OAUTH, endpoint: 'mcp://google-calendar', layers: ['OPERATIONS', 'FINANCE'] as LayerName[] },
];

@Injectable()
export class ConnectorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all connectors for a founder, merged with catalog.
   * Shows both connected and available connectors.
   */
  async listConnectors(founderId: string) {
    const connected = await this.prisma.connector.findMany({
      where: { founderId },
    });

    const connectedMap = new Map(connected.map((c) => [c.name, c]));

    return CONNECTOR_CATALOG.map((cat) => {
      const instance = connectedMap.get(cat.name);
      return {
        ...cat,
        authStatus: instance?.authStatus || AuthStatus.NOT_CONNECTED,
        lastSuccessfulCall: instance?.lastSuccessfulCall || null,
        connected: !!instance,
        connectorId: instance?.id || null,
      };
    });
  }

  /**
   * Initiate a connection flow for a connector.
   * For OAuth: returns an authorization URL.
   * For API key: returns a placeholder for the key input.
   */
  async connect(founderId: string, connectorName: string, authData?: { authCode?: string; apiKey?: string }) {
    const catalogEntry = CONNECTOR_CATALOG.find((c) => c.name === connectorName);
    if (!catalogEntry) throw new NotFoundException('Connector not found in catalog');

    if (catalogEntry.authType === AuthType.API_KEY && authData?.apiKey) {
      // Store encrypted API key
      const encrypted = encrypt(authData.apiKey);
      const connector = await this.prisma.connector.upsert({
        where: { name: connectorName },
        update: {
          authStatus: AuthStatus.CONNECTED,
          encryptedCredentials: encrypted,
          founderId,
        },
        create: {
          name: connectorName,
          displayName: catalogEntry.displayName,
          description: catalogEntry.description,
          mcpServerEndpoint: catalogEntry.endpoint,
          authType: catalogEntry.authType,
          authStatus: AuthStatus.CONNECTED,
          encryptedCredentials: encrypted,
          usedByLayers: catalogEntry.layers,
          founderId,
        },
      });
      return { status: 'connected', connector };
    }

    if (catalogEntry.authType === AuthType.OAUTH) {
      // In production, redirect to OAuth provider
      // For now, create a placeholder
      const connector = await this.prisma.connector.upsert({
        where: { name: connectorName },
        update: {
          authStatus: AuthStatus.CONNECTED,
          founderId,
        },
        create: {
          name: connectorName,
          displayName: catalogEntry.displayName,
          description: catalogEntry.description,
          mcpServerEndpoint: catalogEntry.endpoint,
          authType: catalogEntry.authType,
          authStatus: AuthStatus.CONNECTED,
          usedByLayers: catalogEntry.layers,
          founderId,
        },
      });
      return { status: 'connected', connector, oauthUrl: `${catalogEntry.endpoint}/auth` };
    }

    throw new BadRequestException('Invalid connection request');
  }

  /**
   * Disconnect a connector.
   */
  async disconnect(founderId: string, connectorName: string) {
    await this.prisma.connector.deleteMany({
      where: { name: connectorName, founderId },
    });
    return { status: 'disconnected' };
  }

  /**
   * Check connector health.
   */
  async checkHealth(founderId: string, connectorName: string) {
    const connector = await this.prisma.connector.findFirst({
      where: { name: connectorName, founderId },
    });

    return {
      name: connectorName,
      status: connector?.authStatus || AuthStatus.NOT_CONNECTED,
      lastSuccessfulCall: connector?.lastSuccessfulCall || null,
      healthy: connector?.authStatus === AuthStatus.CONNECTED,
    };
  }
}
