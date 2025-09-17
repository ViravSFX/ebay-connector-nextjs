import { debugLogService } from '../services/debugLogService';

export interface EbayError {
  errorId: number;
  domain: string;
  subDomain?: string;
  category: 'APPLICATION' | 'BUSINESS' | 'REQUEST';
  message: string;
  longMessage?: string;
  parameters?: Array<{
    name: string;
    value: string;
  }>;
}

export interface EbayErrorResponse {
  errors?: EbayError[];
  warnings?: EbayError[];
}

export class EbayApiError extends Error {
  public statusCode: number;
  public type: string;
  public ebayErrorId?: number;
  public ebayErrorCode?: string;
  public category?: string;
  public domain?: string;

  constructor(message: string, statusCode: number, type: string, ebayError?: EbayError) {
    super(message);
    this.name = 'EbayApiError';
    this.statusCode = statusCode;
    this.type = type;

    if (ebayError) {
      this.ebayErrorId = ebayError.errorId;
      this.category = ebayError.category;
      this.domain = ebayError.domain;
    }
  }
}

export class EbayErrorHandler {
  // Map of common eBay error IDs to user-friendly messages and types
  private static readonly ERROR_MAP: Record<number, { type: string; statusCode: number; message: string }> = {
    // OAuth/Authentication errors (1001-1100)
    1001: { type: 'AUTHORIZATION_ERROR', statusCode: 401, message: 'Invalid eBay access token. Please re-authorize your eBay connection.' },
    1002: { type: 'AUTHORIZATION_ERROR', statusCode: 400, message: 'Missing eBay access token. Please authorize your eBay connection.' },
    1003: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Invalid token type in authorization header. Please check your token format.' },
    1004: { type: 'SERVER_ERROR', statusCode: 500, message: 'eBay internal error processing access token. Please try again.' },
    1100: { type: 'PERMISSION_ERROR', statusCode: 403, message: 'Access denied. Insufficient permissions to fulfill the request.' },

    // Rate limiting and access errors (2001-2004)
    2001: { type: 'RATE_LIMIT_ERROR', statusCode: 429, message: 'Too many requests. The request limit has been reached for this resource.' },
    2002: { type: 'RESOURCE_ERROR', statusCode: 404, message: 'Resource not resolved. The requested resource could not be found.' },
    2003: { type: 'SERVICE_ERROR', statusCode: 500, message: 'eBay internal system error. Please contact support if this persists.' },
    2004: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Invalid request. Please check the documentation for this API.' },

    // Routing errors (3001-3005)
    3001: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Request rejected. Please check your request parameters.' },
    3002: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Malformed request. Please check the documentation for proper format.' },
    3003: { type: 'RESOURCE_ERROR', statusCode: 404, message: 'Resource not found. The requested resource could not be located.' },
    3004: { type: 'SERVICE_ERROR', statusCode: 500, message: 'eBay routing internal error. Please try again later.' },
    3005: { type: 'SERVICE_ERROR', statusCode: 502, message: 'eBay service temporarily unavailable. Please try again later.' },

    // Additional common business errors
    25002: { type: 'BUSINESS_ERROR', statusCode: 400, message: 'Invalid business operation. Please check your request parameters.' },
    25006: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Invalid SKU format. Please use a valid SKU identifier.' },
    25701: { type: 'BUSINESS_ERROR', statusCode: 400, message: 'Listing policy violation. Please review eBay listing requirements.' },
    25702: { type: 'BUSINESS_ERROR', statusCode: 400, message: 'Category not supported for this operation.' },
    25703: { type: 'VALIDATION_ERROR', statusCode: 400, message: 'Required listing information missing. Please provide all required fields.' }
  };

  static handleEbayError(error: any, context: string = 'eBay API'): never {
    // Handle eBay API response errors
    if (error.response?.data) {
      const ebayResponse: EbayErrorResponse = error.response.data;

      // Check for eBay errors array
      if (ebayResponse.errors && ebayResponse.errors.length > 0) {
        const primaryError = ebayResponse.errors[0];
        const mappedError = this.ERROR_MAP[primaryError.errorId];

        if (mappedError) {
          // Use predefined error mapping
          throw new EbayApiError(
            mappedError.message,
            mappedError.statusCode,
            mappedError.type,
            primaryError
          );
        } else {
          // Handle unmapped errors based on category
          throw this.handleErrorByCategory(primaryError, error.response.status);
        }
      }

      // Check for warnings (might still need to be handled)
      if (ebayResponse.warnings && ebayResponse.warnings.length > 0) {
        const warning = ebayResponse.warnings[0];
        debugLogService.warn('EBAY_ERROR', `⚠️ eBay API Warning (${context}): ${warning.message}`);
      }
    }

    // Handle HTTP status codes without eBay error structure
    if (error.response?.status) {
      switch (error.response.status) {
        case 401:
          throw new EbayApiError(
            'eBay authorization required. Please check your credentials.',
            401,
            'AUTHORIZATION_ERROR'
          );
        case 403:
          throw new EbayApiError(
            'Access forbidden. Insufficient permissions for this eBay operation.',
            403,
            'PERMISSION_ERROR'
          );
        case 404:
          throw new EbayApiError(
            'eBay resource not found.',
            404,
            'RESOURCE_ERROR'
          );
        case 429:
          throw new EbayApiError(
            'eBay rate limit exceeded. Please try again later.',
            429,
            'RATE_LIMIT_ERROR'
          );
        case 500:
        case 502:
        case 503:
          throw new EbayApiError(
            'eBay service temporarily unavailable. Please try again later.',
            503,
            'SERVICE_ERROR'
          );
        default:
          throw new EbayApiError(
            `eBay API error: ${error.response.statusText || 'Unknown error'}`,
            error.response.status,
            'API_ERROR'
          );
      }
    }

    // Handle network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new EbayApiError(
        'Unable to connect to eBay services. Please check your internet connection.',
        503,
        'CONNECTION_ERROR'
      );
    }

    // Generic error fallback
    throw new EbayApiError(
      `${context} failed: ${error.message || 'Unknown error'}`,
      500,
      'SERVER_ERROR'
    );
  }

  private static handleErrorByCategory(ebayError: EbayError, httpStatus: number): never {
    switch (ebayError.category) {
      case 'REQUEST':
        // Usually auth, validation, or format issues
        if (ebayError.domain === 'ACCESS' || ebayError.message.toLowerCase().includes('access')) {
          throw new EbayApiError(
            'Access denied. Please check your eBay authorization.',
            401,
            'AUTHORIZATION_ERROR',
            ebayError
          );
        }
        throw new EbayApiError(
          `Request error: ${ebayError.longMessage || ebayError.message}`,
          400,
          'VALIDATION_ERROR',
          ebayError
        );

      case 'BUSINESS':
        // Business rule violations
        throw new EbayApiError(
          `Business rule violation: ${ebayError.longMessage || ebayError.message}`,
          400,
          'BUSINESS_ERROR',
          ebayError
        );

      case 'APPLICATION':
        // System errors
        throw new EbayApiError(
          `eBay system error: ${ebayError.longMessage || ebayError.message}`,
          503,
          'SERVICE_ERROR',
          ebayError
        );

      default:
        throw new EbayApiError(
          `eBay API error: ${ebayError.longMessage || ebayError.message}`,
          httpStatus || 500,
          'API_ERROR',
          ebayError
        );
    }
  }

  // Helper method to check if an error is retryable
  static isRetryableError(error: EbayApiError): boolean {
    return ['RATE_LIMIT_ERROR', 'SERVICE_ERROR', 'CONNECTION_ERROR'].includes(error.type);
  }

  // Helper method to get user-friendly error message
  static getUserFriendlyMessage(error: EbayApiError): string {
    switch (error.type) {
      case 'AUTHORIZATION_ERROR':
        return 'Please reconnect your eBay account to continue.';
      case 'PERMISSION_ERROR':
        return 'Your eBay account needs additional permissions for this operation.';
      case 'RATE_LIMIT_ERROR':
        return 'You\'ve made too many requests. Please wait a moment and try again.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'BUSINESS_ERROR':
        return 'This operation violates eBay business rules. Please review your request.';
      case 'SERVICE_ERROR':
      case 'CONNECTION_ERROR':
        return 'eBay services are temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }
}