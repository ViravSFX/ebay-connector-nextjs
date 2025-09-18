import { NextRequest } from 'next/server';
import { TokenService } from '@/app/lib/services/auth';
import prisma from '@/app/lib/services/database';
import { RealtimeDebugLogger } from '@/app/lib/services/realtimeDebugLogger';

// Server-Sent Events endpoint for real-time log streaming
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return new Response('Invalid token', { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, email: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return new Response('Super Admin access required', { status: 403 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Helper function to send SSE data
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Send initial connection message with existing logs
        const sendInitialData = async () => {
          try {
            const existingLogs = await RealtimeDebugLogger.getLogs(100);
            send({
              type: 'init',
              logs: existingLogs,
              timestamp: new Date().toISOString()
            });

            console.log(`SSE: Client connected, sent ${existingLogs.length} existing logs`);
          } catch (error) {
            console.error('SSE: Error sending initial data:', error);
          }
        };

        sendInitialData();

        // Subscribe to new log events (only triggers when new logs are added)
        const unsubscribeNewLog = RealtimeDebugLogger.onNewLog((log) => {
          send({
            type: 'newLog',
            log,
            timestamp: new Date().toISOString()
          });
        });

        // Subscribe to logs cleared events
        const unsubscribeCleared = RealtimeDebugLogger.onLogsCleared(() => {
          console.log('SSE: Logs cleared, notifying client');
          send({
            type: 'logsCleared',
            timestamp: new Date().toISOString()
          });
        });

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          send({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
        }, 30000);

        // Handle client disconnect
        const cleanup = () => {
          console.log('SSE: Client disconnected, cleaning up');
          clearInterval(heartbeat);
          unsubscribeNewLog();
          unsubscribeCleared();
          try {
            controller.close();
          } catch (error) {
            // Ignore errors when closing
          }
        };

        // Listen for abort signal (client disconnect)
        request.signal.addEventListener('abort', cleanup);

        // Store cleanup function for potential use
        (controller as any).cleanup = cleanup;
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('Error in debug stream:', error);
    return new Response('Internal server error', { status: 500 });
  }
}