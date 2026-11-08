# BitSecure Network Interface API

This small Node.js service reads the network interfaces of the machine on which it is running and exposes them to the BitSecure website.

## Requirements

- Node.js 18 or newer
- No npm packages are required; it uses Node.js built-in modules.

## Start

From this directory, run:

```bash
npm start
```

Or run `node server.js` directly.

By default, the API listens only on `127.0.0.1:4317`.

## API

### `GET /health`

Checks whether the local service is running.

### `GET /api/network-interfaces`

Returns the machine hostname, operating-system platform, fetch time, and interface records containing:

- Interface name
- IP address and address family
- MAC address
- Netmask and CIDR
- Whether the address is an internal/loopback address

Example URL: `http://127.0.0.1:4317/api/network-interfaces`

## Connecting the website

The browser can request:

```js
const response = await fetch("http://127.0.0.1:4317/api/network-interfaces");
if (!response.ok) throw new Error("Could not read network interfaces");
const data = await response.json();
console.log(data.interfaces);
```

The API allows the default local development origin `http://localhost:8000`. If the website runs at a different origin, set `ALLOWED_ORIGIN` to that exact origin before starting the service.

For example:

```bash
ALLOWED_ORIGIN=http://localhost:5500 npm start
```

PowerShell:

```powershell
$env:ALLOWED_ORIGIN="http://localhost:5500"
npm start
```

## Security and deployment notes

- The service binds to `127.0.0.1`, not a public network interface. It is intended to run locally on the user's own computer.
- It exposes local network metadata, so do not change the bind address to `0.0.0.0` or expose this endpoint publicly.
- A hosted website cannot inspect a visitor's computer by itself. The visitor must run this local Node.js service, and the browser must be permitted to connect to localhost. Browser local-network access policies and HTTPS restrictions may also apply.
- CORS is not authentication. Keep the service local and do not expose it to untrusted networks.
