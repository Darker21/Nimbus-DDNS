const fs = require("fs");
const {Logger} = require("winston");

/**
 * Manages configuration data from a JSON file.
 * This class loads, saves, and provides access to configuration data.
 */
class ConfigManager {
  /**
   * Creates an instance of ConfigManager.
   * @param {string} configPath - Path to the configuration file.
   * @param {Logger} logger - The logger instance.
   */
  constructor(configPath, logger) {
    this.configPath = configPath;
    this.logger = logger;
    this.config = this.loadConfig();
  }

  /**
   * Loads configuration from the specified file.
   * If the file exists, it parses the JSON data; otherwise, throws an error.
   * @returns {object} - The loaded configuration data.
   * @throws {Error} - If the configuration file is not found.
   */
  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      this.logger.info(`Loading config from ${this.configPath}`);
      return JSON.parse(fs.readFileSync(this.configPath, "utf8"));
    }

    throw new Error(`Config file not found (${this.configPath})`);
  }

  /**
   * Saves the configuration to the specified file atomically.
   * Merges the existing configuration with the provided new configuration before saving.
   * Uses a temporary file and renames to ensure atomicity.
   * @param {object} newConfig - The new configuration data to merge and save.
   */
  async saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      const tempPath = `${this.configPath}.tmp`;

      // Write to a temporary file first
      await fs.promises.writeFile(
        tempPath,
        JSON.stringify(this.config, null, 2),
        "utf8"
      );

      // Rename the temporary file to replace the original config file atomically
      await fs.promises.rename(tempPath, this.configPath);

      this.logger.info(`Config saved atomically to ${this.configPath}`);
    } catch (error) {
      this.logger.error(`Failed to save config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves a configuration value by key.
   * @param {string} key - The key of the configuration value to retrieve.
   * @returns {*} - The configuration value associated with the key.
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Sets a configuration value for a given key.
   * Saves the updated configuration to the file after setting the value.
   * @param {string} key - The key of the configuration value to set.
   * @param {*} value - The value to set for the given key.
   */
  set(key, value) {
    this.config[key] = value;
    this.saveConfig(this.config);
  }
}

module.exports = ConfigManager;
