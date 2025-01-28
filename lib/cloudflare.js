const axios = require("axios");
const logger = require("winston").Logger;

/**
 * Cloudflare API client.
 * This class provides methods for interacting with the Cloudflare API.
 */
class CloudflareAPI {
  /**
   * Creates an instance of the CloudflareAPI.
   * Initializes the API client with credentials and configuration.
   * @param {string} apiKey - The Cloudflare API key.
   * @param {string} email - The email address associated with the API key.
   * @param {string} domainName - The domain name to manage.
   * @param {logger} logger - The logger instance for outputting messages.
   */
  constructor(apiKey, email, domainName, logger) {
    if (!logger) {
      throw Error("Logger was not provided to CloudflareAPI instance");
    }

    this.logger = logger;
    this.api = axios.create({
      baseURL: "https://api.cloudflare.com/client/v4",
      proxy:
        process.env.USE_PROXY === "true"
          ? { host: "127.0.0.1", port: 8888 }
          : false,
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": apiKey,
      },
    });
    this.domainName = domainName;
  }

  /**
   * Retrieves the public IP address.
   * Fetches the public IP address using a third-party service.
   * @returns {Promise<string>} - The public IP address.
   */
  async getPublicIP() {
    this.logger.http("GET: Fetching public IP address...");

    let response;
    try {
      response = await axios.get("https://ipv4.icanhazip.com");
    } catch {
      response = await axios.get("https://api.ipify.org");
    }

    return response.data.trim();
  }

  /**
   * Retrieves the Zone ID for the configured domain.
   * Fetches the Zone ID from the Cloudflare API.
   * @returns {Promise<string>} - The Zone ID.
   * @throws {Error} - If the Zone ID cannot be fetched.
   */
  async getZoneId() {
    this.logger.http("GET: Fetching Zone ID...");
    const response = await this.api.get("/zones", {
      params: { name: this.domainName },
    });

    if (!response.data.success) {
      throw new Error("Failed to fetch Zone ID");
    }

    return response.data.result[0].id;
  }

  /**
   * Retrieves the Record ID for a given subdomain.
   * Fetches the Record ID from the Cloudflare API based on the provided zone ID and subdomain.
   * @param {string} zoneId - The ID of the zone.
   * @param {string} subdomain - The subdomain name.
   * @returns {Promise<string|null>} - The Record ID, or null if not found.
   * @throws {Error} - If the Record ID cannot be fetched.
   */
  async getRecordId(zoneId, subdomain) {
    this.logger.http("GET: Fetching Record ID...");
    const response = await this.api.get(`/zones/${zoneId}/dns_records`, {
      params: { type: "A", name: `${subdomain}.${this.domainName}` },
    });

    if (!response.data.success) {
      throw new Error("Failed to fetch Record ID");
    }

    return response.data.result[0]?.id || null;
  }

  /**
   * Updates a DNS record with a new public IP address.
   * Sends a PUT request to the Cloudflare API to update the DNS record.
   * @param {string} zoneId - The ID of the zone.
   * @param {string} recordId - The ID of the DNS record.
   * @param {string} subdomain - The subdomain name.
   * @param {string} publicIP - The new public IP address.
   * @returns {Promise<object>} - The response data from the Cloudflare API.
   * @throws {Error} - If the DNS record cannot be updated.
   */
  async updateDNSRecord(zoneId, recordId, subdomain, publicIP) {
    this.logger.http(
      `PUT: Updating DNS record for ${subdomain} to IP: ${publicIP}`
    );
    const response = await this.api.put(
      `/zones/${zoneId}/dns_records/${recordId}`,
      {
        type: "A",
        name: `${subdomain}.${this.domainName}`,
        content: publicIP,
        ttl: 1800,
        proxied: false,
      }
    );

    if (!response.data.success) {
      throw new Error("Failed to update DNS record");
    }

    this.logger.http("DNS record updated successfully.");
    return response.data;
  }
}

module.exports = CloudflareAPI;
