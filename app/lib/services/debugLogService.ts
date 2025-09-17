// Note: Socket.IO functionality is disabled for Vercel deployment compatibility
// Vercel doesn't support WebSocket connections

export interface DebugLog {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  category: string;
  message: string;
  metadata?: any;
}

class DebugLogService {
  private logs: DebugLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs

  // Disabled for Vercel compatibility
  initialize() {
    console.log('🔌 DebugLogService initialized (Socket.IO disabled for Vercel deployment)');
  }

  log(level: 'info' | 'error' | 'warn' | 'debug', category: string, message: string, metadata?: any) {
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata
    };

    // Add to internal storage
    this.logs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Note: Real-time log broadcasting disabled for Vercel compatibility
    // In production, you could use alternatives like:
    // - Database logging with API polling
    // - External logging services (LogRocket, Datadog, etc.)
    // - Server-Sent Events (SSE) as an alternative to WebSockets

    // Also log to console for backward compatibility
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${category}]`;

    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}`, metadata ? metadata : '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`, metadata ? metadata : '');
        break;
      case 'info':
        console.log(`ℹ️ ${prefix} ${message}`, metadata ? metadata : '');
        break;
      case 'debug':
        console.log(`🔍 ${prefix} ${message}`, metadata ? metadata : '');
        break;
    }
  }

  // Convenience methods
  info(category: string, message: string, metadata?: any) {
    this.log('info', category, message, metadata);
  }

  error(category: string, message: string, metadata?: any) {
    this.log('error', category, message, metadata);
  }

  warn(category: string, message: string, metadata?: any) {
    this.log('warn', category, message, metadata);
  }

  debug(category: string, message: string, metadata?: any) {
    this.log('debug', category, message, metadata);
  }

  getLogs(): DebugLog[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    // Note: Real-time log clearing notification disabled for Vercel compatibility
  }
}

// Export singleton instance
export const debugLogService = new DebugLogService();
export default debugLogService;