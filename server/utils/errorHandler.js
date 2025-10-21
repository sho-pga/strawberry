// Error handling utilities for AetherPress
const { v4: uuidv4 } = require("uuid");

const ERROR_TYPES = {
  VALIDATION: "VALIDATION_ERROR",
  PROCESSING: "PROCESSING_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};

/**
 * Creates a standardized error response object
 * @param {string} message - User-friendly error message
 * @param {string} code - Error type code
 * @param {number} status - HTTP status code
 * @param {any} details - Technical details (only included in development)
 * @returns {Object} Formatted error response
 */
function createErrorResponse(message, code, status, details = null) {
  const isDev = process.env.NODE_ENV !== "production";
  const errorResponse = {
    error: {
      message,
      code,
      status,
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    },
  };

  // Only include details in development mode
  if (isDev && details) {
    errorResponse.error.details = details;
  }

  return errorResponse;
}

/**
 * Sends a validation error response (400)
 */
function sendValidationError(res, message, details = null) {
  const response = createErrorResponse(
    message,
    ERROR_TYPES.VALIDATION,
    400,
    details
  );
  res.status(400).json(response);
}

/**
 * Sends a processing error response (500)
 */
function sendProcessingError(res, message, details = null) {
  const response = createErrorResponse(
    message,
    ERROR_TYPES.PROCESSING,
    500,
    details
  );
  res.status(500).json(response);
}

/**
 * Sends a not found error response (404)
 */
function sendNotFoundError(res, message, details = null) {
  const response = createErrorResponse(
    message,
    ERROR_TYPES.NOT_FOUND,
    404,
    details
  );
  res.status(404).json(response);
}

/**
 * Sends a service unavailable error response (503)
 */
function sendServiceUnavailableError(res, message, details = null) {
  const response = createErrorResponse(
    message,
    ERROR_TYPES.SERVICE_UNAVAILABLE,
    503,
    details
  );
  res.status(503).json(response);
}

/**
 * Enhanced error middleware that maintains backward compatibility
 */
function errorMiddleware(err, req, res, next) {
  // Log error details
  console.error("--- Error Handler ---");
  console.error("Time:", new Date().toISOString());
  console.error("Method:", req.method);
  console.error("URL:", req.originalUrl);
  console.error("Body:", req.body);
  console.error("Error Stack:", err.stack);

  const isDev = process.env.NODE_ENV !== "production";
  const status = err.status || 500;

  // Create enhanced error response while maintaining backward compatibility
  const response = {
    error: isDev ? err.message : "Internal Server Error",
    ...(isDev && { stack: err.stack }),
    // Add new format properties as extensions
    ...createErrorResponse(
      isDev ? err.message : "Internal Server Error",
      ERROR_TYPES.PROCESSING,
      status,
      isDev ? err.stack : null
    ),
  };

  res.status(status).json(response);
}

module.exports = {
  ERROR_TYPES,
  createErrorResponse,
  sendValidationError,
  sendProcessingError,
  sendNotFoundError,
  sendServiceUnavailableError,
  errorMiddleware,
};
