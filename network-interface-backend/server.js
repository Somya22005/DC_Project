/**
 * BitSecure local network-interface API
 *
 * Run with: node server.js
 * Optional environment variables:
 *   PORT=4317
 *   ALLOWED_ORIGIN=http://localhost:8000
 *
 * The server binds to 127.0.0.1 so the API is available only on this machine.
 */

"use strict";

const http = require("node:http");
const os = require("node:os");

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "4317", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:8000";

function sendJson(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin ? {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin"
    } : {})
  });
  response.end(JSON.stringify(payload, null, 2));
}

function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      result.push({
        name,
        address: address.address,
        family: address.family,
        mac: address.mac,
        netmask: address.netmask,
        cidr: address.cidr,
        internal: address.internal,
        scopeid: address.scopeid ?? null
      });
    }
  }

  return result;
}

const server = http.createServer((request, response) => {
  const origin = request.headers.origin;
  const originAllowed = !origin || origin === ALLOWED_ORIGIN;

  if (!originAllowed) {
    return sendJson(response, 403, {
      success: false,
      error: "Origin is not allowed. Set ALLOWED_ORIGIN to your website origin."
    });
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": origin || ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin"
    });
    return response.end();
  }

  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (request.method !== "GET") {
    return sendJson(response, 405, {
      success: false,
      error: "Method not allowed. Use GET."
    }, origin || ALLOWED_ORIGIN);
  }

  if (url.pathname === "/health") {
    return sendJson(response, 200, {
      success: true,
      service: "BitSecure Network Interface API",
      status: "running"
    }, origin || ALLOWED_ORIGIN);
  }

  if (url.pathname === "/api/network-interfaces") {
    try {
      const interfaces = getNetworkInterfaces();
      return sendJson(response, 200, {
        success: true,
        hostname: os.hostname(),
        platform: os.platform(),
        interfaces,
        count: interfaces.length,
        fetchedAt: new Date().toISOString()
      }, origin || ALLOWED_ORIGIN);
    } catch (error) {
      console.error("Failed to read network interfaces:", error);
      return sendJson(response, 500, {
        success: false,
        error: "Unable to retrieve network interface information."
      }, origin || ALLOWED_ORIGIN);
    }
  }

  return sendJson(response, 404, {
    success: false,
    error: "Route not found.",
    availableRoutes: ["/health", "/api/network-interfaces"]
  }, origin || ALLOWED_ORIGIN);
});

server.listen(PORT, HOST, () => {
  console.log(`BitSecure Network Interface API running at http://${HOST}:${PORT}`);
  console.log(`Allowed website origin: ${ALLOWED_ORIGIN}`);
  console.log("Endpoint: GET /api/network-interfaces");
});

function shutdown() {
  console.log("\nShutting down network-interface API...");
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
