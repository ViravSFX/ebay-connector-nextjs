import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/app/lib/services/auth';
import prisma from '@/app/lib/services/database';
import { RealtimeDebugLogger } from '@/app/lib/services/realtimeDebugLogger';

// Get debug logs from database
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, email: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Super Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch logs from database
    const sinceDate = since ? new Date(since) : undefined;
    const logs = await RealtimeDebugLogger.getLogs(limit, sinceDate);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        lastUpdated: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error getting debug logs:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clear debug logs
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, email: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Super Admin access required' },
        { status: 403 }
      );
    }

    await RealtimeDebugLogger.clearAllLogs();

    return NextResponse.json({
      success: true,
      message: 'Debug logs cleared',
      data: {
        clearedAt: new Date().toISOString(),
        clearedBy: user.email,
      }
    });

  } catch (error) {
    console.error('Error clearing debug logs:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}