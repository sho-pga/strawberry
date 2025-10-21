# ISSUES_FN-BN_ERR-LOG

## Alignment of Frontend and Backend Error Handling & Logging

### Guiding Principle

All endpoints and client logic must follow the backend's `/preview` endpoint as the canonical template for error handling and logging. This ensures consistency, debuggability, and a seamless developer/user experience.

---

## Brainstormed Alignment Points

1. **Standardized Error Response**

   - All endpoints return errors as:
     ```json
     {
       "success": false,
       "error": {
         "type": "ValidationError|ProcessingError|...",
         "message": "Human-readable message",
         "details": {
           /* optional, context-specific */
         },
         "timestamp": "ISO8601 string"
       }
     }
     ```
   - Validation errors use `sendValidationError`, processing errors use `sendProcessingError`.

2. **Consistent Status Codes**

   - Validation errors: HTTP 400
   - Processing errors: HTTP 500
   - Success: HTTP 200 with `{ success: true, data: ... }`

3. **Error Logging Structure**

   - Log entries include: timestamp, endpoint, error type, message, stack (in dev), and request context.
   - Log format matches backend’s logger (JSON, with environment-aware detail).

4. **Frontend Handling**

   - Always check for `success: false` and parse the `error` object.
   - Display user-friendly messages; log full error details in dev mode.
   - Use the same error type/message mapping as backend for UI consistency.

5. **Testing and Validation**

   - Write tests to ensure all endpoints (not just /preview) return errors in the same format.
   - Frontend tests expect backend error structure for all API calls.

6. **Documentation**
   - Document the error response template and logging expectations in `docs/`.
   - Reference /preview as the canonical example for all new endpoints.

---

## Actionables

1. **Backend**

   - [ ] Audit all endpoints to ensure they use the standardized error response (see /preview).
   - [ ] Refactor any endpoints not using `sendValidationError` or `sendProcessingError` for validation/processing errors.
   - [ ] Refactor the centralized error handler (middleware) to always use `createErrorResponse` for consistency, so all error responses (including those from `next(err)`) match the `/preview` template: `{ error: { message, code, status, timestamp, ... } }`.
   - [ ] Ensure all error logs include timestamp, endpoint, error type, message, and stack (in dev).
   - [ ] Update backend documentation to state that `/preview` is the canonical error handling example.

2. **Frontend**

   - [ ] Update API layer to always check for `success: false` and parse the `error` object.
   - [ ] Ensure user-facing error messages are clear and actionable.
   - [ ] Log full error details in development mode (including stack if available).
   - [ ] Update frontend tests to expect the backend error structure.

3. **Testing**

   - [ ] Add/expand tests for error handling on both frontend and backend.
   - [ ] Simulate validation and processing errors in tests to verify format and logging.

4. **Documentation**
   - [ ] Add/expand documentation in `docs/` on error handling and logging alignment.
   - [ ] Include code samples and reference to /preview endpoint.

---

> **Goal:** Achieve seamless, predictable, and debuggable error handling and logging across the stack, with `/preview` as the gold standard.
