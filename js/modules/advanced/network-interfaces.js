/**
 * learning module: live network interfaces
 *
 * Reads the current computer's network-interface details from the locally running
 * Node.js companion service. The browser never executes Node.js itself.
 */
import { panel, tbl, vd } from '../../core/ui-helpers.js';
import { $, esc } from '../../core/utils.js';
import { regMod } from '../registry.js';

const API_BASE = 'http://127.0.0.1:4317';

regMod({
  id: 'network-interfaces',
  group: 'adv',
  title: 'Network interfaces',
  desc: 'Fetch live IP, MAC, netmask and CIDR information from this computer through the local Node.js companion service.',
  obj: [
    'Identify active and loopback network interfaces.',
    'Read IPv4 and IPv6 addresses, MAC addresses and subnet details.',
    'Understand that the data comes from the operating system via a local Node.js service.',
  ],
  mount(root) {
    root.innerHTML =
      panel(
        'Live system network information',
        `<p class="hint">Click the button to ask the local Node.js service to read the network interfaces on this computer.</p>
        <div class="btnrow"><button class="btn" id="ni-fetch" type="button">Fetch network interfaces</button><span class="hint" id="ni-status" role="status" aria-live="polite">Not fetched yet.</span></div>
        <div id="ni-message"></div>`
      ) +
      '<div id="ni-summary"></div><div id="ni-results"></div>';

    const button = $('#ni-fetch', root);
    const status = $('#ni-status', root);
    const message = $('#ni-message', root);
    const summary = $('#ni-summary', root);
    const results = $('#ni-results', root);

    button.onclick = async () => {
      button.disabled = true;
      button.textContent = 'Fetching…';
      status.textContent = 'Connecting to the local Node.js service…';
      message.innerHTML = '';
      summary.innerHTML = '';
      results.innerHTML = '';

      try {
        const response = await fetch(`${API_BASE}/api/network-interfaces`, {
          method: 'GET',
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
        }

        status.textContent = `Fetched at ${new Date(data.fetchedAt).toLocaleTimeString()}.`;
        summary.innerHTML = panel(
          'This computer',
          `<div class="stats">
            <div><b>${esc(data.hostname || 'Unknown')}</b><span>Hostname</span></div>
            <div><b>${esc(data.platform || 'Unknown')}</b><span>Operating system</span></div>
            <div><b>${Number(data.count) || 0}</b><span>Address records</span></div>
          </div>`
        );

        if (!Array.isArray(data.interfaces) || data.interfaces.length === 0) {
          results.innerHTML = panel('Interfaces', '<p class="hint">The operating system returned no interface records.</p>');
        } else {
          const rows = data.interfaces.map(item => [
            item.name || '—',
            item.family || '—',
            item.address || '—',
            item.mac || '—',
            item.netmask || '—',
            item.cidr || '—',
            item.internal ? 'Yes' : 'No',
          ]);
          results.innerHTML = panel(
            'Detected network interfaces',
            tbl(['Interface', 'Family', 'IP address', 'MAC address', 'Netmask', 'CIDR', 'Internal'], rows, 'network-interfaces-table')
          );
        }
      } catch (error) {
        status.textContent = 'Could not fetch interface information.';
        const detail = error instanceof TypeError
          ? 'The local service may not be running, or the browser may have blocked access to localhost. Start the Node.js service on this same computer and check its allowed website origin.'
          : error.message;
        message.innerHTML = vd(
          'warn',
          'Connection failed',
          `${esc(detail)}<br><br>Start the companion service with <code>npm start</code> inside <code>network-interface-backend</code>. The service must run on the same computer as this browser.`
        );
      } finally {
        button.disabled = false;
        button.textContent = 'Fetch network interfaces';
      }
    };
  },
});
