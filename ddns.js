/* MIT LICENSE
Copyright (c) 2025 Jacob Darker
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

require("dotenv").config();
const createLogger = require("./lib/logger");
const CloudflareAPI = require("./lib/cloudflare");
const ConfigManager = require("./lib/config");

// Load environment variables
const {
    API_KEY,
    EMAIL,
    DOMAIN_NAME,
    SUBDOMAIN = "@",
    CONFIG_PATH = "./ddns-config.json",
    LOG_PATH = "./nimbus-ddns.log",
    LOG_LEVEL = "info",
} = process.env;

const logger = createLogger(LOG_PATH, LOG_LEVEL);
const configManager = new ConfigManager(CONFIG_PATH, logger);
const cloudflare = new CloudflareAPI(API_KEY, EMAIL, DOMAIN_NAME, logger);

/**
 * Main function to update the DNS record.
 * Retrieves the public IP, zone ID, and record ID, then updates the DNS record on Cloudflare.
 */
async function main() {
    try {
        const publicIP = await cloudflare.getPublicIP();
        logger.info(`Current Public IP: ${publicIP}`);

        let zoneId = configManager.get("zoneId");
        if (!zoneId) {
            zoneId = await cloudflare.getZoneId();
            configManager.set("zoneId", zoneId);
        }

        let recordId = configManager.get("recordId");
        if (!recordId) {
            recordId = await cloudflare.getRecordId(zoneId, SUBDOMAIN);
            if (!recordId) {
                throw new Error(
                    "DNS record not found. Please create it first."
                );
            }
            configManager.set("recordId", recordId);
        }

        await cloudflare.updateDNSRecord(zoneId, recordId, SUBDOMAIN, publicIP);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
    }
}

main();
