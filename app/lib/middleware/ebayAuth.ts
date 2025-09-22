import { NextRequest, NextResponse } from "next/server";
import { requireApiToken } from "./apiAuth";
import { logToDebug } from "./queryDebugMiddleware";
import { EbayTokenRefreshService } from "../services/ebayTokenRefresh";
import { validateEndpointAccess } from "./endpointValidation";
import { validateEbayOperation } from "./ebayScopeValidation";
import prisma from "../services/database";

export interface EbayAuthData {
    user: {
        id: string;
        email: string;
        role: string;
    };
    token: {
        id: string;
        name: string;
    };
    ebayAccount: {
        id: string;
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date | null;
        friendlyName: string | null;
        ebayUserId: string | null;
        ebayUsername: string | null;
        status: string;
    };
}

export function withEbayAuth(
    requiredEndpoint: string,
    handler: (
        request: NextRequest,
        authData: EbayAuthData,
        context?: any
    ) => Promise<Response | NextResponse>,
    requiredEbayOperation?: keyof typeof import("./ebayScopeValidation").EBAY_OPERATION_SCOPES
) {
    return requireApiToken(
        async (request: NextRequest, apiAuthData, context?: any) => {
            try {
                await logToDebug(
                    "EBAY_AUTH",
                    "eBay Auth Middleware Called",
                    {},
                    "INFO"
                );

                // Get accountId from URL path (e.g., /api/ebay/[accountId]/inventory)
                const url = new URL(request.url);
                const pathSegments = url.pathname.split("/");
                const ebayIndex = pathSegments.indexOf("ebay");
                const accountId =
                    ebayIndex !== -1 && ebayIndex + 1 < pathSegments.length
                        ? pathSegments[ebayIndex + 1]
                        : "";

                // Capture request data for logging
                let requestData: any = {};
                if (request.method === "GET") {
                    requestData = {
                        queryParams: Object.fromEntries(url.searchParams),
                    };
                } else {
                    const body = await request.json();
                    requestData = { requestBody: body };
                }

                if (!accountId) {
                    await logToDebug(
                        "EBAY_AUTH",
                        "Missing accountId in request",
                        {
                            userId: apiAuthData.user.id,
                            method: request.method,
                            ...requestData,
                        },
                        "ERROR"
                    );

                    return NextResponse.json(
                        { success: false, message: "accountId is required" },
                        { status: 400 }
                    );
                }

                // Validate endpoint access - check if API token has access to this endpoint
                const endpointValidation = await validateEndpointAccess(
                    requiredEndpoint,
                    apiAuthData,
                    "eBay Auth Middleware"
                );

                if (!endpointValidation.isValid) {
                    return endpointValidation.errorResponse!;
                }

                const ebayAccount = await prisma.ebayUserToken.findFirst({
                    where: {
                        id: accountId,
                        userId: apiAuthData.user.id,
                    },
                    select: {
                        id: true,
                        friendlyName: true,
                        ebayUserId: true,
                        ebayUsername: true,
                        accessToken: true,
                        refreshToken: true,
                        expiresAt: true,
                        status: true,
                        userSelectedScopes: true,
                    } as any,
                });

                if (!ebayAccount) {
                    await logToDebug(
                        "EBAY_AUTH",
                        "eBay account not found",
                        {
                            accountId,
                            userId: apiAuthData.user.id,
                        },
                        "ERROR"
                    );

                    return NextResponse.json(
                        { success: false, message: "eBay account not found" },
                        { status: 404 }
                    );
                }

                if (ebayAccount.status !== "active") {
                    await logToDebug(
                        "EBAY_AUTH",
                        "eBay account access denied - account not active",
                        {
                            accountId,
                            userId: apiAuthData.user.id,
                            currentStatus: ebayAccount.status,
                            friendlyName: ebayAccount.friendlyName
                        },
                        "ERROR"
                    );

                    return NextResponse.json(
                        {
                            success: false,
                            message: "eBay account is not active and cannot be used for API requests",
                            details: {
                                accountId: ebayAccount.id,
                                friendlyName: ebayAccount.friendlyName,
                                currentStatus: ebayAccount.status,
                                requiredStatus: "active",
                                action: "Please reactivate this eBay account or connect a new one"
                            }
                        },
                        { status: 403 }
                    );
                }

                // Validate eBay scope permissions if operation is specified
                if (requiredEbayOperation) {
                    const scopeValidation = await validateEbayOperation(
                        requiredEbayOperation,
                        {
                            id: ebayAccount.id,
                            userSelectedScopes: ebayAccount.userSelectedScopes,
                            friendlyName: ebayAccount.friendlyName,
                        },
                        `eBay Auth Middleware for ${requiredEndpoint}`
                    );

                    if (!scopeValidation.isValid) {
                        return scopeValidation.errorResponse!;
                    }

                    await logToDebug(
                        "EBAY_AUTH",
                        "eBay scope validation passed",
                        {
                            requiredEndpoint,
                            requiredEbayOperation,
                            accountId: ebayAccount.id,
                        },
                        "INFO"
                    );
                }

                await logToDebug(
                    "EBAY_AUTH",
                    "Endpoint validation passed",
                    {
                        requiredEndpoint,
                        accountId: ebayAccount.id,
                    },
                    "INFO"
                );

                await logToDebug(
                    "EBAY_AUTH",
                    "Starting token validation process",
                    {
                        friendlyName: ebayAccount.friendlyName || "Unknown",
                    },
                    "INFO"
                );

                let validAccount;
                try {
                    validAccount =
                        await EbayTokenRefreshService.ensureValidToken({
                            id: ebayAccount.id,
                            accessToken: ebayAccount.accessToken,
                            refreshToken: ebayAccount.refreshToken,
                            expiresAt: ebayAccount.expiresAt,
                            friendlyName: ebayAccount.friendlyName,
                        });

                    await logToDebug(
                        "EBAY_AUTH",
                        "Token validation completed successfully",
                        {
                            friendlyName:
                                validAccount.friendlyName || "Unknown",
                        },
                        "INFO"
                    );
                } catch (error) {
                    await logToDebug(
                        "EBAY_AUTH",
                        "Token validation failed with error",
                        {
                            accountId: ebayAccount.id,
                            friendlyName: ebayAccount.friendlyName || "Unknown",
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error",
                            errorStack:
                                error instanceof Error ? error.stack : null,
                            errorType:
                                error instanceof Error
                                    ? error.constructor.name
                                    : typeof error,
                            hasRefreshToken: !!ebayAccount.refreshToken,
                        },
                        "ERROR"
                    );

                    return NextResponse.json(
                        {
                            success: false,
                            message:
                                error instanceof Error
                                    ? error.message
                                    : "Token validation failed",
                            data: {
                                account: {
                                    id: ebayAccount.id,
                                    friendlyName: ebayAccount.friendlyName,
                                    isExpired: true,
                                    expiresAt: ebayAccount.expiresAt,
                                    requiresReauth: true,
                                },
                            },
                        },
                        { status: 400 }
                    );
                }

                const authData: EbayAuthData = {
                    user: apiAuthData.user,
                    token: apiAuthData.token,
                    ebayAccount: {
                        id: validAccount.id,
                        accessToken: validAccount.accessToken,
                        refreshToken: validAccount.refreshToken,
                        expiresAt: validAccount.expiresAt,
                        friendlyName: ebayAccount.friendlyName,
                        ebayUserId: ebayAccount.ebayUserId,
                        ebayUsername: ebayAccount.ebayUsername,
                        status: ebayAccount.status,
                    },
                };

                await logToDebug(
                    "EBAY_AUTH",
                    "eBay authentication successful, calling handler",
                    {
                        friendlyName:
                            authData.ebayAccount.friendlyName || "Unknown",
                    },
                    "INFO"
                );

                return await handler(request, authData, context);
            } catch (error) {
                await logToDebug(
                    "EBAY_AUTH",
                    "eBay Auth Middleware failed with unexpected error",
                    {
                        userId: apiAuthData.user.id,
                        userEmail: apiAuthData.user.email,
                        method: request.method,
                        url: request.url,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                        errorStack: error instanceof Error ? error.stack : null,
                        errorType:
                            error instanceof Error
                                ? error.constructor.name
                                : typeof error,
                    },
                    "ERROR"
                );

                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Internal server error during eBay authentication",
                    },
                    { status: 500 }
                );
            }
        }
    );
}
