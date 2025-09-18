import prisma from './database';
import { EventEmitter } from 'events';

// Define LogLevel enum locally for type safety
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface DebugLogData {
  level: LogLevel;
  category: string;
  message: string;
  metadata?: any;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// Event emitter for real-time notifications
class DebugEventEmitter extends EventEmitter {}
const debugEvents = new DebugEventEmitter();

export class RealtimeDebugLogger {
  /**
   * Log a message to the database and emit real-time event
   */
  static async log(data: DebugLogData): Promise<any> {
    try {
      const logEntry = await prisma.debugLog.create({
        data: {
          level: data.level,
          category: data.category,
          message: data.message,
          metadata: data.metadata,
          method: data.method,
          url: data.url,
          statusCode: data.statusCode,
          duration: data.duration,
          userAgent: data.userAgent,
          ip: data.ip,
          userId: data.userId,
        },
      });

      // Emit real-time event for SSE subscribers
      debugEvents.emit('newLog', logEntry);

      return logEntry;
    } catch (error) {
      console.error('Error logging to database:', error);
      return null;
    }
  }

  /**
   * Log an info message
   */
  static async info(category: string, message: string, metadata?: any, additionalData?: Partial<DebugLogData>): Promise<any> {
    return await this.log({
      level: LogLevel.INFO,
      category,
      message,
      metadata,
      ...additionalData,
    });
  }

  /**
   * Log a debug message
   */
  static async debug(category: string, message: string, metadata?: any, additionalData?: Partial<DebugLogData>): Promise<any> {
    return await this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      metadata,
      ...additionalData,
    });
  }

  /**
   * Log a warning message
   */
  static async warn(category: string, message: string, metadata?: any, additionalData?: Partial<DebugLogData>): Promise<any> {
    return await this.log({
      level: LogLevel.WARN,
      category,
      message,
      metadata,
      ...additionalData,
    });
  }

  /**
   * Log an error message
   */
  static async error(category: string, message: string, metadata?: any, additionalData?: Partial<DebugLogData>): Promise<any> {
    return await this.log({
      level: LogLevel.ERROR,
      category,
      message,
      metadata,
      ...additionalData,
    });
  }

  /**
   * Get recent logs from database
   */
  static async getLogs(limit: number = 100, since?: Date): Promise<any[]> {
    try {
      const where = since ? { createdAt: { gte: since } } : {};

      const logs = await prisma.debugLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error fetching logs from database:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time log events
   */
  static onNewLog(callback: (log: any) => void): () => void {
    debugEvents.on('newLog', callback);

    // Return unsubscribe function
    return () => {
      debugEvents.off('newLog', callback);
    };
  }

  /**
   * Clear all logs
   */
  static async clearAllLogs(): Promise<void> {
    try {
      await prisma.debugLog.deleteMany({});

      // Emit clear event
      debugEvents.emit('logsCleared');
    } catch (error) {
      console.error('Error clearing all logs:', error);
    }
  }

  /**
   * Subscribe to logs cleared events
   */
  static onLogsCleared(callback: () => void): () => void {
    debugEvents.on('logsCleared', callback);

    // Return unsubscribe function
    return () => {
      debugEvents.off('logsCleared', callback);
    };
  }

  /**
   * Clean up old logs (keep only last N days)
   */
  static async cleanupOldLogs(daysToKeep: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await prisma.debugLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }
}

export default RealtimeDebugLogger;