// Logger implementation that mirrors backend error handling structure
// and provides environment-aware logging capabilities

const LOG_LEVELS = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  DEBUG: "debug",
};

const ENV = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

class Logger {
  static levels = LOG_LEVELS;

  static formatMessage(level, context) {
    return {
      timestamp: new Date().toISOString(),
      level,
      ...context,
      environment: ENV.isDev ? "development" : "production",
    };
  }

  static shouldLog(level) {
    // In production, only log WARN and ERROR by default
    if (ENV.isProd) {
      return [LOG_LEVELS.WARN, LOG_LEVELS.ERROR].includes(level);
    }
    return true;
  }

  static log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, {
      message,
      ...context,
    });

    if (ENV.isDev) {
      console[level](JSON.stringify(formattedMessage, null, 2));
    } else {
      console[level](JSON.stringify(formattedMessage));
    }

    return formattedMessage;
  }

  static info(message, context = {}) {
    return this.log(LOG_LEVELS.INFO, message, context);
  }

  static warn(message, context = {}) {
    return this.log(LOG_LEVELS.WARN, message, context);
  }

  static error(message, context = {}) {
    if (context.error instanceof Error) {
      context.stack = ENV.isDev ? context.error.stack : undefined;
      context.errorType = context.error.constructor.name;
    }
    return this.log(LOG_LEVELS.ERROR, message, context);
  }

  static debug(message, context = {}) {
    if (ENV.isDev) {
      return this.log(LOG_LEVELS.DEBUG, message, context);
    }
  }

  // API specific logging methods
  static apiRequest(endpoint, method, context = {}) {
    return this.info(`API Request: ${method} ${endpoint}`, {
      type: "api_request",
      endpoint,
      method,
      ...context,
    });
  }

  static apiResponse(endpoint, status, context = {}) {
    const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    return this.log(level, `API Response: ${status} from ${endpoint}`, {
      type: "api_response",
      endpoint,
      status,
      ...context,
    });
  }

  static apiError(endpoint, error, context = {}) {
    return this.error(`API Error: ${endpoint}`, {
      type: "api_error",
      endpoint,
      error,
      ...context,
    });
  }

  static apiRetry(endpoint, attempt, maxRetries, context = {}) {
    return this.warn(`API Retry: ${endpoint}`, {
      type: "api_retry",
      endpoint,
      attempt,
      maxRetries,
      ...context,
    });
  }
}

export default Logger;
