import { auth } from '../auth/firebase-client.js';
import { getIdToken } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

const MAX_HISTORY = 8;
let history = [];
let busy = false;

function addMessage(list, role, content) {
  const item = document.createElement('div');
  item.className = 'dc-ai-message ' + role;
  item.textContent = content;
  list.append(item);
  list.scrollTop = list.scrollHeight;
}

export function initDataCommsAssistant() {
  if (document.getElementById('dc-ai-launcher')) return;

  const launcher = document.createElement('button');
  launcher.id = 'dc-ai-launcher';
  launcher.className = 'dc-ai-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open Data Communications AI assistant');
  launcher.innerHTML = '<span aria-hidden="true">✦</span><span>Ask AI</span>';

  const panel = document.createElement('section');
  panel.id = 'dc-ai-panel';
  panel.className = 'dc-ai-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Data Communications AI assistant');
  panel.innerHTML = [
    '<header class="dc-ai-header">',
    '  <div><strong>BitSecure AI</strong><small>Data Communications tutor</small></div>',
    '  <button type="button" class="dc-ai-close" aria-label="Close assistant">×</button>',
    '</header>',
    '<div class="dc-ai-messages" role="log" aria-live="polite" aria-relevant="additions">',
    '  <div class="dc-ai-message assistant">Hi! 👋 Ask me anything about Data Communications or Computer Networks.</div>',
    '</div>',
    '<form class="dc-ai-form">',
    '  <textarea rows="2" maxlength="2000" required placeholder="Ask a networking doubt…"></textarea>',
    '  <button type="submit" aria-label="Send message">➤</button>',
    '</form>',
    '<p class="dc-ai-note">Focused on Data Communications &amp; Computer Networks</p>'
  ].join('\n');

  document.body.append(launcher, panel);

  const messages = panel.querySelector('.dc-ai-messages');
  const form = panel.querySelector('form');
  const input = form.querySelector('textarea');
  const send = form.querySelector('button[type="submit"]');
  const close = panel.querySelector('.dc-ai-close');

  launcher.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    launcher.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) input.focus();
  });

  close.addEventListener('click', function () {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || busy) return;

    if (!window.BITSECURE_API_URL) {
      addMessage(messages, 'assistant', 'The AI service is not connected yet. Set BITSECURE_API_URL in js/config.js to your FastAPI backend.');
      return;
    }

    busy = true;
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    addMessage(messages, 'user', message);

    const pending = document.createElement('div');
    pending.className = 'dc-ai-message assistant pending';
    pending.textContent = 'Thinking…';
    messages.append(pending);
    messages.scrollTop = messages.scrollHeight;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please sign in again to use the AI assistant.');

      const token = await getIdToken(user);
      const apiBase = window.BITSECURE_API_URL.replace(/\/+$/, '');
      const response = await fetch(apiBase + '/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          message: message,
          history: history.slice(-MAX_HISTORY)
        })
      });

      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        throw new Error(data.detail || 'The assistant could not answer right now.');
      }

      const answer = data.answer || 'I could not generate an answer. Please try again.';
      pending.remove();
      addMessage(messages, 'assistant', answer);
      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: answer }
      );
      history = history.slice(-MAX_HISTORY);
    } catch (error) {
      pending.remove();
      addMessage(messages, 'assistant', error.message || 'Something went wrong. Please try again.');
    } finally {
      busy = false;
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  });
}
