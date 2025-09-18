import { NextRequest } from "next/server";
import {
    withQueryDebugLogging,
    logToDebug,
} from "@/app/lib/middleware/queryDebugMiddleware";
import { withEbayAuth } from "@/app/lib/middleware/ebayAuth";
import { getEbayConfig, getEbayUrls } from "@/app/lib/config/ebay";

async function testEbayApiAccess(accessToken: string) {
    try {
        const config = getEbayConfig();
        const urls = getEbayUrls(config.isProduction);

        const response = await fetch(`${urls.api}/oauth/api_scope`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        const responseText = await response.text();

        return {
            hasAccess: response.ok,
            statusCode: response.status,
            statusText: response.statusText,
            responseData: response.ok ? responseText : null,
            error: response.ok ? null : responseText,
        };
    } catch (error) {
        return {
            hasAccess: false,
            statusCode: 0,
            statusText: "Network Error",
            responseData: null,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

const postHandler = withEbayAuth(async (request: NextRequest, authData) => {
    try {
        const config = getEbayConfig();

        await logToDebug("EBAY", "Check Scopes API Called", {
            accountId: authData.ebayAccount.id,
            friendlyName: authData.ebayAccount.friendlyName || 'Unknown',
            userId: authData.user.id
        }, "INFO");

        const apiTest = await testEbayApiAccess(authData.ebayAccount.accessToken);

        // Note: scopes are not available in the middleware, we need to fetch them separately
        // This is because the middleware only fetches essential fields for token validation
        const scopes = []; // Will be empty for now, can be enhanced later if needed

        return Response.json({
            success: true,
            data: {
                account: {
                    id: authData.ebayAccount.id,
                    friendlyName: authData.ebayAccount.friendlyName,
                    ebayUserId: authData.ebayAccount.ebayUserId,
                    ebayUsername: authData.ebayAccount.ebayUsername,
                    status: authData.ebayAccount.status,
                    isExpired: false,
                    expiresAt: authData.ebayAccount.expiresAt,
                    lastUsedAt: null, // Not available in middleware, can be enhanced later
                },
                apiScopeTest: {
                    endpoint: "https://api.ebay.com/oauth/api_scope",
                    description: "View public data from eBay",
                    hasAccess: apiTest.hasAccess,
                    statusCode: apiTest.statusCode,
                    statusText: apiTest.statusText,
                    responseData: apiTest.responseData,
                    error: apiTest.error,
                    testedAt: new Date().toISOString(),
                    environment: config.isProduction ? "production" : "sandbox",
                },
                storedScopes: {
                    total: 0,
                    scopes: [],
                },
                apiTokenInfo: {
                    tokenName: authData.token.name,
                    user: authData.user.email,
                },
            },
        });
    } catch (error) {
        await logToDebug(
            "API",
            "Error checking eBay scopes:",
            {
                error: error instanceof Error ? error.message : "Unknown error",
                errorStack: error instanceof Error ? error.stack : null,
                errorType:
                    error instanceof Error
                        ? error.constructor.name
                        : typeof error,
            },
            "ERROR"
        );
        return Response.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
});

export const POST = withQueryDebugLogging(postHandler);
