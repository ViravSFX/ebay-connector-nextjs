import { logToDebug } from '../middleware/queryDebugMiddleware';

export interface EndpointValidationResult {
  isValid: boolean;
  hasEndpointAccess: boolean;
  errors: string[];
}

export class EndpointValidator {
  /**
   * Validate if API token has access to the requested endpoint
   */
  static async validateEndpointAccess(
    requestedEndpoint: string,
    apiTokenEndpoints: string[],
    context: string = 'API call'
  ): Promise<EndpointValidationResult> {
    const result: EndpointValidationResult = {
      isValid: true,
      hasEndpointAccess: false,
      errors: []
    };

    await logToDebug('ENDPOINT_VALIDATOR', 'Starting endpoint validation', {
      requestedEndpoint,
      apiTokenEndpoints,
      context
    }, 'DEBUG');

    // Check if API token has access to this endpoint
    result.hasEndpointAccess = apiTokenEndpoints.includes(requestedEndpoint);

    if (!result.hasEndpointAccess) {
      result.isValid = false;
      result.errors.push(`API token does not have access to endpoint: ${requestedEndpoint}`);
    }

    await logToDebug('ENDPOINT_VALIDATOR', 'Endpoint validation completed', {
      requestedEndpoint,
      isValid: result.isValid,
      hasEndpointAccess: result.hasEndpointAccess,
      errors: result.errors
    }, result.isValid ? 'INFO' : 'WARN');

    return result;
  }

  /**
   * Get user-friendly error message for endpoint validation failure
   */
  static getUserFriendlyErrorMessage(result: EndpointValidationResult, endpoint: string): string {
    if (result.isValid) return '';

    if (!result.hasEndpointAccess) {
      return `🔑 API Token Issue: Your API token does not have access to "${endpoint}". Please update your API token to include this endpoint.`;
    }

    return 'Access denied';
  }
}