import { NextResponse } from "next/server";
import { EndpointValidator } from "../services/endpointValidator";
import { logToDebug } from "./queryDebugMiddleware";

export interface EndpointValidationResult {
    isValid: boolean;
    errorResponse?: NextResponse;
}

export async function validateEndpointAccess(
    requiredEndpoint: string,
    apiAuthData: any,
    context: string = "API"
): Promise<EndpointValidationResult> {
    try {
        await logToDebug(
            "ENDPOINT_VALIDATION",
            "Starting endpoint validation",
            {
                requiredEndpoint,
                apiTokenEndpoints: apiAuthData.token?.permissions?.endpoints,
                context,
            },
            "DEBUG"
        );

        const apiTokenEndpoints =
            apiAuthData.token?.permissions?.endpoints || [];

        const endpointValidation =
            await EndpointValidator.validateEndpointAccess(
                requiredEndpoint,
                apiTokenEndpoints,
                `${context} for ${requiredEndpoint}`
            );

        if (!endpointValidation.isValid) {
            await logToDebug(
                "ENDPOINT_VALIDATION",
                "Endpoint validation failed",
                {
                    requiredEndpoint,
                    hasEndpointAccess: endpointValidation.hasEndpointAccess,
                    errors: endpointValidation.errors,
                    context,
                },
                "ERROR"
            );

            const errorResponse = NextResponse.json(
                {
                    success: false,
                    message: "API token does not have access to this endpoint",
                    details: {
                        requiredEndpoint,
                        hasEndpointAccess: endpointValidation.hasEndpointAccess,
                        errors: endpointValidation.errors,
                    },
                },
                { status: 403 }
            );

            return {
                isValid: false,
                errorResponse,
            };
        }

        await logToDebug(
            "ENDPOINT_VALIDATION",
            "Endpoint validation passed",
            {
                requiredEndpoint,
                context,
            },
            "INFO"
        );

        return {
            isValid: true,
        };
    } catch (error) {
        await logToDebug(
            "ENDPOINT_VALIDATION",
            "Endpoint validation failed with error",
            {
                requiredEndpoint,
                context,
                error: error instanceof Error ? error.message : "Unknown error",
                errorStack: error instanceof Error ? error.stack : null,
            },
            "ERROR"
        );

        const errorResponse = NextResponse.json(
            {
                success: false,
                message: "Internal error during endpoint validation",
            },
            { status: 500 }
        );

        return {
            isValid: false,
            errorResponse,
        };
    }
}
