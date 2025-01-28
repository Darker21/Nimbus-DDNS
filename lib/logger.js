const winston = require("winston");

/**
 * Creates a Winston logger instance.
 * This function configures a logger that writes to both the console and a file,
 * formatting messages with a timestamp and log level.
 * @param {string} logPath - The path to the log file.
 * @param {string} [logLevel="info"] - The minimum log level to record. Must be one of 'error', 'warn', 'info', 'http', 'verbose', or 'debug'.
 * @returns {winston.Logger} - A configured Winston logger instance.
 * @throws {Error} - If logPath is not a non-empty string or if logLevel is invalid.
 **/
function createLogger(logPath, logLevel = "info") {
  if (!logPath || typeof logPath !== "string" || logPath.trim() === "") {
    throw new Error("logPath must be a non-empty string");
  }

  const validLogLevels = ["error", "warn", "info", "http", "verbose", "debug"];
  if (!validLogLevels.includes(logLevel)) {
    throw new Error(
      `Invalid log level. Must be one of: ${validLogLevels.join(", ")}`
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          `${timestamp} [${level.toUpperCase()}] ${message}`
      )
    ),
    transports: [
      new winston.transports.Console({ level: logLevel }),
      new winston.transports.File({ level: logLevel, filename: logPath }),
    ],
  });
}

module.exports = createLogger;
