import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/services/database';
import { TokenService } from '../../../lib/services/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and get user
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Await params and fetch specific eBay account
    const { id } = await params;
    const ebayAccount = await prisma.ebayUserToken.findFirst({
      where: {
        id: id,
        userId: decoded.userId,
      },
      select: {
        id: true,
        ebayUserId: true,
        ebayUsername: true,
        expiresAt: true,
        tokenType: true,
        scopes: true,
        status: true,
        friendlyName: true,
        tags: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ebayAccount) {
      return NextResponse.json(
        { success: false, message: 'eBay account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ebayAccount,
    });
  } catch (error) {
    console.error('Error fetching eBay account:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and get user
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const updateData = await request.json();

    // Await params and update eBay account
    const { id } = await params;
    const ebayAccount = await prisma.ebayUserToken.update({
      where: {
        id: id,
        userId: decoded.userId,
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        ebayUserId: true,
        ebayUsername: true,
        expiresAt: true,
        tokenType: true,
        scopes: true,
        status: true,
        friendlyName: true,
        tags: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'eBay account updated successfully',
      data: ebayAccount,
    });
  } catch (error) {
    console.error('Error updating eBay account:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and get user
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Await params and delete eBay account
    const { id } = await params;
    await prisma.ebayUserToken.delete({
      where: {
        id: id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'eBay account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting eBay account:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}