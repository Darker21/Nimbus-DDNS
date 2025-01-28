const axios = require("axios");
const { Logger } = require("winston");
const CloudflareAPI = require("../lib/cloudflare");

jest.mock("axios");

describe("CloudflareAPI", () => {
  const cloudflare = () =>
    new CloudflareAPI("apiKey", "email", "domainName", logger);
  const logger = { http: jest.fn() };
  const mockResponse = jest.fn();

  beforeEach(() => {
    axios.create.mockReturnValue({
      get: mockResponse,
      put: mockResponse,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getZoneId", () => {
    it("should return the zone ID", async () => {
      const mockZoneId = "zone123";
      mockResponse.mockResolvedValueOnce({
        data: { success: true, result: [{ id: mockZoneId }] },
      });

      const zoneId = await cloudflare().getZoneId();

      expect(zoneId).toBe(mockZoneId);
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Zone ID...");
      expect(mockResponse).toHaveBeenCalledWith("/zones", {
        params: { name: "domainName" },
      });
    });

    it("should throw an error if the API call fails", async () => {
      mockResponse.mockRejectedValueOnce(new Error("Network error"));

      await expect(cloudflare().getZoneId()).rejects.toThrow("Network error");
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Zone ID...");
    });

    it("should throw an error if the response is not successful", async () => {
      mockResponse.mockResolvedValueOnce({
        data: { success: false, errors: [{ message: "Error message" }] },
      });

      await expect(cloudflare().getZoneId()).rejects.toThrow(
        "Failed to fetch Zone ID"
      );
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Zone ID...");
    });
  });

  describe("getRecordId", () => {
    it("should return the record ID if found", async () => {
      const mockRecordId = "record456";
      const zoneId = "zone123";
      const subdomain = "sub";
      mockResponse.mockResolvedValueOnce({
        data: { success: true, result: [{ id: mockRecordId }] },
      });

      const recordId = await cloudflare().getRecordId(zoneId, subdomain);

      expect(recordId).toBe(mockRecordId);
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Record ID...");
      expect(mockResponse).toHaveBeenCalledWith(
        `/zones/${zoneId}/dns_records`,
        {
          params: { type: "A", name: `${subdomain}.domainName` },
        }
      );
    });

    it("should return null if the record ID is not found", async () => {
      const zoneId = "zone123";
      const subdomain = "sub";
      mockResponse.mockResolvedValueOnce({
        data: { success: true, result: [] },
      });

      const recordId = await cloudflare().getRecordId(zoneId, subdomain);

      expect(recordId).toBeNull();
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Record ID...");
    });

    it("should throw an error if the API call fails", async () => {
      const zoneId = "zone123";
      const subdomain = "sub";
      mockResponse.mockRejectedValueOnce(new Error("Network error"));

      await expect(cloudflare().getRecordId(zoneId, subdomain)).rejects.toThrow(
        "Network error"
      );
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Record ID...");
    });

    it("should throw an error if the response is not successful", async () => {
      const zoneId = "zone123";
      const subdomain = "sub";
      mockResponse.mockResolvedValueOnce({
        data: { success: false, errors: [{ message: "Error message" }] },
      });

      await expect(cloudflare().getRecordId(zoneId, subdomain)).rejects.toThrow(
        "Failed to fetch Record ID"
      );
      expect(logger.http).toHaveBeenCalledWith("GET: Fetching Record ID...");
    });
  });

  describe("updateDNSRecord", () => {
    it("should update the DNS record", async () => {
      const zoneId = "zone123";
      const recordId = "record456";
      const subdomain = "sub";
      const publicIP = "1.2.3.4";
      const expectedResponse = { data: { success: true } };
      mockResponse.mockResolvedValueOnce(expectedResponse);

      const response = await cloudflare().updateDNSRecord(
        zoneId,
        recordId,
        subdomain,
        publicIP
      );

      expect(response).toBe(expectedResponse.data);
      expect(logger.http).toHaveBeenCalledWith(
        `PUT: Updating DNS record for ${subdomain} to IP: ${publicIP}`
      );
      expect(mockResponse).toHaveBeenCalledWith(
        `/zones/${zoneId}/dns_records/${recordId}`,
        {
          type: "A",
          name: `${subdomain}.domainName`,
          content: publicIP,
          ttl: 1800,
          proxied: false,
        }
      );
      expect(logger.http).toHaveBeenCalledWith(
        "DNS record updated successfully."
      );
    });

    it("should throw an error if the API call fails", async () => {
      const zoneId = "zone123";
      const recordId = "record456";
      const subdomain = "sub";
      const publicIP = "1.2.3.4";
      mockResponse.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        cloudflare().updateDNSRecord(zoneId, recordId, subdomain, publicIP)
      ).rejects.toThrow("Network error");
      expect(logger.http).toHaveBeenCalledWith(
        `PUT: Updating DNS record for ${subdomain} to IP: ${publicIP}`
      );
    });

    it("should throw an error if the response is not successful", async () => {
      const zoneId = "zone123";
      const recordId = "record456";
      const subdomain = "sub";
      const publicIP = "1.2.3.4";

      mockResponse.mockResolvedValueOnce({
        data: { success: false, errors: [{ message: "Error message" }] },
      });

      await expect(
        cloudflare().updateDNSRecord(zoneId, recordId, subdomain, publicIP)
      ).rejects.toThrow("Failed to update DNS record");
      expect(logger.http).toHaveBeenCalledWith(
        `PUT: Updating DNS record for ${subdomain} to IP: ${publicIP}`
      );
    });
  });

  describe("getPublicIP", () => {
    it("should return the public IP address from ipv4.icanhazip.com", async () => {
      const mockIP = "1.2.3.4";
      axios.get.mockResolvedValueOnce({ data: `${mockIP}\n` });

      const ip = await cloudflare().getPublicIP();

      expect(ip).toBe(mockIP);
      expect(logger.http).toHaveBeenCalledWith(
        "GET: Fetching public IP address..."
      );
      expect(axios.get).toHaveBeenCalledWith("https://ipv4.icanhazip.com");
    });

    it("should return the public IP address from api.ipify.org if ipv4.icanhazip.com fails", async () => {
      const mockIP = "1.2.3.4";
      axios.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: mockIP });

      const ip = await cloudflare().getPublicIP();

      expect(ip).toBe(mockIP);
      expect(logger.http).toHaveBeenCalledWith(
        "GET: Fetching public IP address..."
      );
      expect(axios.get).toHaveBeenCalledWith("https://ipv4.icanhazip.com");
      expect(axios.get).toHaveBeenCalledWith("https://api.ipify.org");
    });

    it("should trim whitespace from the returned IP address", async () => {
      const mockIP = "1.2.3.4";
      axios.get.mockResolvedValueOnce({ data: `   ${mockIP}   \n` });

      const ip = await cloudflare().getPublicIP();

      expect(ip).toBe(mockIP);
    });

    it("should throw an error if both IP address services fail", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));

      await expect(cloudflare().getPublicIP()).rejects.toThrow("Network error");
      expect(logger.http).toHaveBeenCalledWith(
        "GET: Fetching public IP address..."
      );
    });

    it("should handle unexpected response data from ipv4.icanhazip.com", async () => {
      axios.get.mockResolvedValueOnce({ data: null });

      await expect(cloudflare().getPublicIP()).rejects.toThrow();
    });

    it("should handle unexpected response data from api.ipify.org", async () => {
      axios.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: undefined });

      await expect(cloudflare().getPublicIP()).rejects.toThrow();
    });
  });

  describe("Constructor", () => {
    it("should initialize correctly with valid parameters and no proxy", () => {
      const apiKey = "testApiKey";
      const email = "test@example.com";
      const domainName = "example.com";
      const logger = new Logger();
      logger.http = jest.fn();
      delete process.env.USE_PROXY;

      const instance = new CloudflareAPI(apiKey, email, domainName, logger);

      expect(instance.logger).toBe(logger);
      expect(instance.domainName).toBe(domainName);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.cloudflare.com/client/v4",
        headers: {
          "X-Auth-Email": "test@example.com",
          "X-Auth-Key": "testApiKey",
        },
        proxy: false,
      });
    });

    it("should initialize correctly with valid parameters and proxy", () => {
      process.env.USE_PROXY = "true";

      const instance = new CloudflareAPI(
        "apiKey",
        "email",
        "domainName",
        new Logger()
      );

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.cloudflare.com/client/v4",
        headers: {
          "X-Auth-Email": "email",
          "X-Auth-Key": "apiKey",
        },
        proxy: {
          host: "127.0.0.1",
          port: 8888,
        },
      });
    });

    it("should throw an error if logger is not provided", () => {
      expect(() => new CloudflareAPI("apiKey", "email", "domainName")).toThrow(
        "Logger was not provided to CloudflareAPI instance"
      );
    });
  });
});
