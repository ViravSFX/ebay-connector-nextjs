import { NextRequest, NextResponse } from 'next/server';
import { RealtimeDebugLogger } from '../services/realtimeDebugLogger';

/**
 * Middleware that logs API calls when ?debug=1 is present in the query string
 * Usage: export const GET = withQueryDebugLogging(async (request: NextRequest) => { ... });
 */
export function withQueryDebugLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response | NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<Response | NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const shouldLog = url.searchParams.get('debug') === '1';

    let response: Response | NextResponse;
    let error: string | undefined;

    try {
      // Call the original handler
      response = await handler(request, ...args);

      // Log if debug=1 is present
      if (shouldLog) {
        const duration = Date.now() - startTime;
        const userAgent = request.headers.get('user-agent') || undefined;
        const ip = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown';

        await RealtimeDebugLogger.info(
          'API',
          `${request.method} ${url.pathname} - ${response.status}`,
          {
            queryParams: Object.fromEntries(url.searchParams),
            headers: Object.fromEntries(request.headers.entries()),
          },
          {
            method: request.method,
            url: request.url,
            statusCode: response.status,
            duration,
            userAgent,
            ip,
          }
        );
      }

    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';

      // Log error if debug=1 is present
      if (shouldLog) {
        const duration = Date.now() - startTime;
        const userAgent = request.headers.get('user-agent') || undefined;
        const ip = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown';

        await RealtimeDebugLogger.error(
          'API',
          `${request.method} ${url.pathname} - ERROR: ${error}`,
          {
            queryParams: Object.fromEntries(url.searchParams),
            error,
          },
          {
            method: request.method,
            url: request.url,
            statusCode: 500,
            duration,
            userAgent,
            ip,
          }
        );
      }

      // Create error response
      response = NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    return response;
  };
}

/**
 * Manually log a debug message to database
 */
export async function logToDebug(
  category: string,
  message: string,
  metadata?: any,
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'INFO'
) {
  switch (level) {
    case 'DEBUG':
      await RealtimeDebugLogger.debug(category, message, metadata);
      break;
    case 'INFO':
      await RealtimeDebugLogger.info(category, message, metadata);
      break;
    case 'WARN':
      await RealtimeDebugLogger.warn(category, message, metadata);
      break;
    case 'ERROR':
      await RealtimeDebugLogger.error(category, message, metadata);
      break;
  }
}

export default withQueryDebugLogging;