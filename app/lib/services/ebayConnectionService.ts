import prisma from './database';

export interface EbayConnectionData {
  id: string;
  name: string;
  clientId: string;
  clientSecretMasked: string;
  devId: string;
  redirectUrl: string;
  environment: string;
  ebayUsernameMasked?: string;
  ebayPasswordMasked?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEbayConnectionData {
  name: string;
  clientId: string;
  clientSecret: string;
  devId: string;
  redirectUrl: string;
  environment: 'sandbox' | 'production';
  ebayUsername?: string;
  ebayPassword?: string;
}

export interface UpdateEbayConnectionData {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  devId?: string;
  redirectUrl?: string;
  environment?: 'sandbox' | 'production';
  ebayUsername?: string;
  ebayPassword?: string;
}

export class EbayConnectionService {
  // Mask sensitive data for client-side display
  private static maskClientSecret(clientSecret: string): string {
    if (clientSecret.length <= 8) {
      return '*'.repeat(clientSecret.length);
    }

    const start = clientSecret.substring(0, 4);
    const end = clientSecret.substring(clientSecret.length - 4);
    const middle = '*'.repeat(clientSecret.length - 8);

    return `${start}${middle}${end}`;
  }

  private static maskClientId(clientId: string): string {
    if (clientId.length <= 8) {
      return '*'.repeat(clientId.length);
    }

    const start = clientId.substring(0, 4);
    const end = clientId.substring(clientId.length - 4);
    const middle = '*'.repeat(clientId.length - 8);

    return `${start}${middle}${end}`;
  }

  // Transform database record to secure display format
  private static transformToSecureFormat(connection: any): EbayConnectionData {
    return {
      id: connection.id,
      name: connection.name,
      clientId: this.maskClientId(connection.clientId),
      clientSecretMasked: this.maskClientSecret(connection.clientSecret),
      devId: connection.devId,
      redirectUrl: connection.redirectUrl,
      environment: connection.environment,
      ebayUsernameMasked: connection.ebayUsername ? this.maskClientId(connection.ebayUsername) : undefined,
      ebayPasswordMasked: connection.ebayPassword ? this.maskClientSecret(connection.ebayPassword) : undefined,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  // Create a new eBay connection
  static async createConnection(userId: string, data: CreateEbayConnectionData): Promise<EbayConnectionData> {
    // Check for name conflicts
    const existingConnection = await prisma.ebayConnection.findFirst({
      where: {
        userId,
        name: data.name.trim(),
      },
    });

    if (existingConnection) {
      throw new Error('Connection name already exists');
    }

    const connection = await prisma.ebayConnection.create({
      data: {
        name: data.name.trim(),
        clientId: data.clientId.trim(),
        clientSecret: data.clientSecret.trim(),
        devId: data.devId.trim(),
        redirectUrl: data.redirectUrl.trim(),
        environment: data.environment,
        ebayUsername: data.ebayUsername?.trim() || null,
        ebayPassword: data.ebayPassword?.trim() || null,
        userId,
      },
    });

    return this.transformToSecureFormat(connection);
  }

  // Get all user's eBay connections with masked sensitive data
  static async getUserConnections(userId: string): Promise<EbayConnectionData[]> {
    const connections = await prisma.ebayConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map(connection => this.transformToSecureFormat(connection));
  }

  // Get a single eBay connection by ID
  static async getConnectionById(connectionId: string, userId: string): Promise<EbayConnectionData | null> {
    const connection = await prisma.ebayConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      return null;
    }

    return this.transformToSecureFormat(connection);
  }

  // Update an eBay connection
  static async updateConnection(connectionId: string, userId: string, data: UpdateEbayConnectionData): Promise<EbayConnectionData | null> {
    // Check if connection exists and belongs to user
    const existingConnection = await prisma.ebayConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!existingConnection) {
      return null;
    }

    // Check for name conflicts if name is being updated
    if (data.name && data.name.trim() !== existingConnection.name) {
      const nameConflict = await prisma.ebayConnection.findFirst({
        where: {
          userId,
          name: data.name.trim(),
          id: { not: connectionId },
        },
      });

      if (nameConflict) {
        throw new Error('Connection name already exists');
      }
    }

    // Build update data - only include fields that are provided and not empty
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.clientId !== undefined && data.clientId.trim() !== '') updateData.clientId = data.clientId.trim();
    if (data.clientSecret !== undefined && data.clientSecret.trim() !== '') updateData.clientSecret = data.clientSecret.trim();
    if (data.devId !== undefined) updateData.devId = data.devId.trim();
    if (data.redirectUrl !== undefined) updateData.redirectUrl = data.redirectUrl.trim();
    if (data.environment !== undefined) updateData.environment = data.environment;
    if (data.ebayUsername !== undefined) updateData.ebayUsername = data.ebayUsername?.trim() || null;
    if (data.ebayPassword !== undefined) updateData.ebayPassword = data.ebayPassword?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return this.transformToSecureFormat(existingConnection);
    }

    const updatedConnection = await prisma.ebayConnection.update({
      where: { id: connectionId },
      data: updateData,
    });

    return this.transformToSecureFormat(updatedConnection);
  }

  // Toggle connection status
  static async toggleConnectionStatus(connectionId: string, userId: string, isActive: boolean): Promise<EbayConnectionData | null> {
    const updatedConnection = await prisma.ebayConnection.updateMany({
      where: {
        id: connectionId,
        userId,
      },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    if (updatedConnection.count === 0) {
      return null;
    }

    // Return the updated connection
    const connection = await prisma.ebayConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    return connection ? this.transformToSecureFormat(connection) : null;
  }

  // Delete an eBay connection
  static async deleteConnection(connectionId: string, userId: string): Promise<boolean> {
    const result = await prisma.ebayConnection.deleteMany({
      where: {
        id: connectionId,
        userId,
      },
    });

    return result.count > 0;
  }

  // Get connections grouped by status for Kanban view
  static async getConnectionsForKanban(userId: string): Promise<{
    active: EbayConnectionData[];
    inactive: EbayConnectionData[];
    sandbox: EbayConnectionData[];
    production: EbayConnectionData[];
  }> {
    const connections = await this.getUserConnections(userId);

    const active = connections.filter(conn => conn.isActive);
    const inactive = connections.filter(conn => !conn.isActive);
    const sandbox = connections.filter(conn => conn.environment === 'sandbox');
    const production = connections.filter(conn => conn.environment === 'production');

    return {
      active,
      inactive,
      sandbox,
      production,
    };
  }
}