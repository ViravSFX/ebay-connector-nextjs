import { NextRequest, NextResponse } from 'next/server';
import { withEbayAuth, EbayAuthData } from '@/app/lib/middleware/ebayAuth';
import { withQueryDebugLogging } from '@/app/lib/middleware/queryDebugMiddleware';
import prisma from '@/app/lib/services/database';

const getHandler = withEbayAuth('/ebay/{accountId}/scopes', async (request: NextRequest, authData: EbayAuthData, { params }: { params: Promise<{ accountId: string }> }) => {
    const { accountId } = await params;

    try {
        // Fetch full account data from database to get all fields
        const fullAccount = await prisma.ebayUserToken.findUnique({
            where: { id: authData.ebayAccount.id },
        });

        if (!fullAccount) {
            return NextResponse.json(
                { success: false, message: "Account not found" },
                { status: 404 }
            );
        }

        // Parse scopes safely with type casting
        const account = fullAccount as any;
        const grantedScopes = Array.isArray(account.scopes)
            ? account.scopes.map((scope: any) => String(scope))
            : [];

        const userSelectedScopes = typeof account.userSelectedScopes === 'string'
            ? JSON.parse(account.userSelectedScopes)
            : Array.isArray(account.userSelectedScopes)
                ? account.userSelectedScopes
                : [];

        return NextResponse.json({
            success: true,
            data: {
                account: {
                    id: account.id,
                    friendlyName: account.friendlyName,
                    ebayUsername: account.ebayUsername,
                    status: account.status,
                },
                scopes: {
                    granted: grantedScopes, // What eBay actually granted
                    userSelected: userSelectedScopes, // What user selected in UI
                    grantedCount: grantedScopes.length,
                    userSelectedCount: userSelectedScopes.length,
                    lastUpdated: account.updatedAt,
                    createdAt: account.createdAt,
                },
                token: {
                    type: account.tokenType,
                    expiresAt: account.expiresAt,
                    lastUsedAt: account.lastUsedAt,
                },
                permissions: {
                    canReadInventory: grantedScopes.some((scope: string) =>
                        scope.includes('sell.inventory') || scope.includes('api_scope')
                    ),
                    canManageInventory: grantedScopes.some((scope: string) =>
                        scope.includes('sell.inventory') && !scope.includes('readonly')
                    ),
                    canManageAccount: grantedScopes.some((scope: string) =>
                        scope.includes('sell.account')
                    ),
                    canManageFulfillment: grantedScopes.some((scope: string) =>
                        scope.includes('sell.fulfillment')
                    ),
                }
            }
        });

    } catch (error) {
        console.error('Error fetching scope information:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch scope information",
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}, 'BASIC_ACCESS');

export const GET = withQueryDebugLogging(getHandler);