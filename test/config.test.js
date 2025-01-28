const fs = require("fs");
const ConfigManager = require("../lib/config");

jest.mock("fs");

describe("ConfigManager", () => {
  const configManager = () => new ConfigManager(configPath, logger);
  const logger = { info: jest.fn(), error: jest.fn() };
  const configPath = "test-config.json";

  beforeEach(() => {
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('{ "existing": "value"}');
    fs.promises = {
      writeFile: jest.fn(),
      rename: jest.fn(),
    };
  });

  describe("loadConfig", () => {
    it("should load config from file if it exists", () => {
      const mockConfig = { test: "value" };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = configManager().loadConfig();

      expect(config).toEqual(mockConfig);
      expect(logger.info).toHaveBeenCalledWith(
        `Loading config from ${configPath}`
      );
    });

    it("should throw an error if config file does not exist", () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => configManager().loadConfig()).toThrow(
        `Config file not found (${configPath})`
      );
    });
  });

  describe("saveConfig", () => {
    it("should save config to file", async () => {
      const newConfig = { new: "value" };

      await configManager().saveConfig(newConfig);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        `${configPath}.tmp`,
        JSON.stringify({ ...configManager().config, ...newConfig }, null, 2),
        "utf8"
      );
      expect(fs.promises.rename).toHaveBeenCalledWith(
        `${configPath}.tmp`,
        configPath
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Config saved atomically to ${configPath}`
      );
    });

    it("should merge existing config with new config", async () => {
      configManager().config = { existing: "value" };
      const newConfig = { new: "value" };

      await configManager().saveConfig(newConfig);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        `${configPath}.tmp`,
        JSON.stringify({ existing: "value", new: "value" }, null, 2),
        "utf8"
      );
    });

    it("should log and re-throw error if saving fails", async () => {
      const newConfig = { new: "value" };
      const errorMessage = "Failed to write";
      fs.promises.writeFile.mockRejectedValueOnce(new Error(errorMessage));

      await expect(configManager().saveConfig(newConfig)).rejects.toThrow(
        errorMessage
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to save config: ${errorMessage}`
      );
    });
  });

  describe("get", () => {
    it("should return the value for the given key", () => {
      const value = configManager().get("existing");

      expect(value).toBe("value");
    });

    it("should return undefined if the key does not exist", () => {
      const value = configManager().get("nonexistent");

      expect(value).toBeUndefined();
    });
  });

  describe("set", () => {
    it("should set the value for the given key and save the config", async () => {
      const instance = configManager();

      const key = "test";
      const value = "new value";
      const saveConfigSpy = jest.spyOn(instance, "saveConfig");

      instance.set(key, value);

      expect(instance.config[key]).toBe(value);
      expect(saveConfigSpy).toHaveBeenCalledWith(instance.config);
    });
  });
});
