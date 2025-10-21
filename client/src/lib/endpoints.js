import Logger from "./logger";

/**
 * Base error class for API errors
 */
export class APIError extends Error {
  constructor(message, code, status, requestId, details = null) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }

  static fromResponse(error) {
    return new APIError(
      error.message,
      error.code,
      error.status,
      error.requestId,
      error.details
    );
  }
}

/**
 * Specific error class for validation errors
 */
export class ValidationError extends APIError {
  constructor(message, requestId, details = null) {
    super(message, "VALIDATION_ERROR", 400, requestId, details);
    this.name = "ValidationError";
  }
}

/**
 * Handles API responses and throws appropriate errors
 * @throws {APIError} When the response contains an error
 */
async function handleApiResponse(response) {
  // Be defensive: some tests/mocks may not provide a Headers object.
  let contentType;
  try {
    contentType =
      response?.headers && typeof response.headers.get === "function"
        ? response.headers.get("content-type")
        : response?.headers?.["content-type"];
  } catch (e) {
    contentType = undefined;
  }

  // Parse as JSON when Content-Type indicates JSON, or when the response
  // provides a json() method but doesn't have a Headers-like object (test mocks).
  if (
    contentType?.includes("application/json") ||
    (typeof response?.json === "function" &&
      (!response?.headers || typeof response.headers.get !== "function"))
  ) {
    const data = await response.json();
    if (!response.ok) {
      if (data?.error) {
        throw APIError.fromResponse(data.error);
      }
      throw new APIError("Unknown API error", "UNKNOWN_ERROR", response.status);
    }
    return data;
  }

  return response;
}

/**
 * Export endpoint wrapper for PDF generation
 * @param {Object} content - The content to export as PDF
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<Blob>} The PDF file as a blob
 * @throws {Error} When export fails
 */
export async function exportToPdf(content, options = {}) {
  try {
    // Validate content before sending
    if (!content) {
      throw new ValidationError("Content is required for export", null, {
        provided: typeof content,
      });
    }

    const response = await fetch("/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/pdf, application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(content),
      ...options,
    });

    // Use common response handler; it will return parsed JSON for JSON responses
    // or return the raw response object for non-JSON (e.g., PDF) responses.
    const handled = await handleApiResponse(response);

    // If server returned a PDF, return it as a blob
    const ct = response.headers?.get?.("content-type");
    if (ct?.includes("application/pdf")) {
      return await response.blob();
    }

    // If we got here, the response was neither JSON error nor a PDF
    throw new APIError(
      "Unexpected response type",
      "PROCESSING_ERROR",
      response.status,
      null,
      { contentType: ct, handled }
    );
  } catch (error) {
    if (error instanceof APIError) {
      Logger.error("PDF export failed", {
        requestId: error.requestId,
        code: error.code,
        details: error.details,
      });
      throw error;
    }
    // Wrap unknown errors
    Logger.error("Unexpected error during PDF export", { error });
    throw new APIError("Failed to export PDF", "PROCESSING_ERROR", 500, null, {
      originalError: error.message,
    });
  }
}

/**
 * Preview endpoint wrapper with validation and error classification
 * @param {Object} requestData - The data to send for preview generation
 * @param {string} requestData.prompt - The prompt text to generate preview from
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<{ preview: string, metadata: Object }>}
 * @throws {ValidationError} When request validation fails
 * @throws {APIError} For other API-related failures
 * @throws {Error} For unexpected failures
 */
export async function previewEndpoint(requestData, options = {}) {
  try {
    // Validate request data
    const validationErrors = [];
    if (!requestData?.prompt) {
      validationErrors.push("Prompt is required");
    }
    if (validationErrors.length > 0) {
      Logger.warn("Preview request validation failed", { validationErrors });
      throw new ValidationError("Invalid preview request", null, {
        validationErrors,
        provided: Object.keys(requestData || {}),
      });
    }

    const response = await fetch("/api/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(requestData),
      ...options,
    });

    // Use common response handler
    const data = await handleApiResponse(response);

    // Validate response structure
    if (!data.preview) {
      throw new APIError(
        "Preview response missing required fields",
        "PROCESSING_ERROR",
        500,
        null,
        { provided: Object.keys(data) }
      );
    }

    const result = {
      preview: data.preview,
      metadata: data.metadata || {},
    };

    // Log success for observability and to satisfy tests that expect info calls
    Logger.info("Preview generated successfully", {
      metadata: result.metadata,
    });

    return result;

    // NOTE: unreachable here, kept for clarity
  } catch (error) {
    if (error instanceof APIError) {
      // Log API errors with their context
      Logger.error("Preview generation failed", {
        requestId: error.requestId,
        code: error.code,
        details: error.details,
      });
      throw error;
    }

    // Network or parsing errors
    // Treat TypeError, SyntaxError, or generic errors mentioning 'Network' as network failures
    if (
      error instanceof TypeError ||
      error.name === "SyntaxError" ||
      (typeof error.message === "string" && /network/i.test(error.message))
    ) {
      Logger.error("Preview request network failure", { error });
      throw new APIError(
        "Failed to generate preview: Network or server error",
        "SERVICE_UNAVAILABLE",
        503,
        null,
        { originalError: error.message }
      );
    }

    // Other unexpected errors
    Logger.error("Unexpected preview generation error", { error });
    throw new APIError(
      "Failed to generate preview",
      "PROCESSING_ERROR",
      500,
      null,
      { originalError: error.message }
    );
  }
}
