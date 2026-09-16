/*
  Procurement AI Assistant — SCRIPTED DEMO ONLY.

  This page is a placeholder for a future real conversational-AI
  integration (Claude API or similar). Nothing here does real natural-
  language understanding: `getScriptedResponse()` below is a tiny keyword-
  matching state machine that recognizes exactly the two example inputs
  described in the product spec and falls back to a generic, safe
  acknowledgment for everything else, so the screen never looks broken no
  matter what the user types.

  TODO: replace scripted responses with a real Claude API call when ready —
  all conversation logic is isolated in getScriptedResponse() below; the
  rest of this file (rendering, suggestion accept/reject, progress panel,
  chat UI) should be reusable as-is once that function does real extraction.
*/

/* ---- Left panel: RFP Progress ---- */

const AIA_STRUCTURE_STEPS = [
  { id: 'basic-details', label: 'Basic details' },
  { id: 'boq', label: 'BOQ' },
  { id: 'scope-of-work', label: 'Scope of work' },
  { id: 'payments', label: 'Payments' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'qualification-criteria', label: 'Qualification criteria' },
  { id: 'technical-requirements', label: 'Technical requirements' },
  { id: 'technical-evaluation-criteria', label: 'Technical evaluation criteria' },
];

const AIA_STATUS_LABEL = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'partially-complete': 'Partially complete',
  'complete': 'Complete',
};

const aia = {
  progressPercent: 10,
  stepStatus: Object.fromEntries(AIA_STRUCTURE_STEPS.map((s) => [s.id, 'not-started'])),
  // Values the scripted conversation has inferred, keyed by suggestion id,
  // only ACCEPTED ones get merged into the real form on "Continue with Form".
  acceptedValues: {},
  // Simple turn counter driving the scripted script — see getScriptedResponse().
  conversationStage: 'awaiting-item',
};

function renderProgressPanel() {
  document.getElementById('aia-progress-percent').textContent = `${aia.progressPercent}% complete`;
  document.getElementById('aia-progress-fill').style.width = `${aia.progressPercent}%`;

  document.getElementById('aia-structure-list').innerHTML = AIA_STRUCTURE_STEPS.map((step) => {
    const status = aia.stepStatus[step.id];
    return `
      <div class="aia-structure-item status-${status}">
        <span class="aia-structure-dot">${status === 'complete' ? '<i class="fa-solid fa-check"></i>' : ''}</span>
        <div>
          <div class="aia-structure-label">${step.label}</div>
          <div class="aia-structure-status">${AIA_STATUS_LABEL[status]}</div>
        </div>
      </div>
    `;
  }).join('');
}

function setStepStatus(stepId, status) {
  aia.stepStatus[stepId] = status;
  renderProgressPanel();
}

function bumpProgress(to) {
  aia.progressPercent = Math.max(aia.progressPercent, to);
  renderProgressPanel();
}

/* ---- Chat rendering ---- */

let aiaSuggestionSeq = 0;

function appendMessage(from, text) {
  const list = document.getElementById('aia-messages');
  const row = document.createElement('div');
  row.className = `aia-message-row from-${from}`;
  row.innerHTML = `
    <span class="aia-message-avatar">${from === 'ai' ? '<i class="fa-solid fa-wand-magic-sparkles"></i>' : '<i class="fa-solid fa-user"></i>'}</span>
    <div class="aia-message-bubble">${text}</div>
  `;
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
}

/*
  Renders an inline "AI suggestion" card with Accept / Edit / Reject —
  even though the value came from a scripted match rather than a real
  model, the review-before-commit interaction pattern is the real thing
  this page is meant to demonstrate.

  `onResolve(action, value)` is called with action = 'accept' | 'reject',
  and the (possibly user-edited) value when accepted.
*/
function appendSuggestion({ label, value, onResolve }) {
  const list = document.getElementById('aia-messages');
  const id = `aia-suggest-${aiaSuggestionSeq++}`;
  const card = document.createElement('div');
  card.className = 'aia-suggestion-card';
  card.id = id;
  card.innerHTML = `
    <div class="aia-suggestion-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI suggestion</div>
    <div class="aia-suggestion-body" id="${id}-body">${label}: <strong>${value}</strong></div>
    <div class="aia-suggestion-actions" id="${id}-actions">
      <button type="button" class="aia-suggestion-btn accept" data-act="accept"><i class="fa-solid fa-check"></i> Accept</button>
      <button type="button" class="aia-suggestion-btn edit" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
      <button type="button" class="aia-suggestion-btn reject" data-act="reject"><i class="fa-solid fa-xmark"></i> Reject</button>
    </div>
  `;
  list.appendChild(card);
  list.scrollTop = list.scrollHeight;

  function resolve(action, finalValue) {
    document.getElementById(`${id}-actions`).outerHTML = `<div class="aia-suggestion-resolved-note ${action === 'accept' ? 'accepted' : 'rejected'}">${action === 'accept' ? 'Accepted' : 'Rejected'}</div>`;
    onResolve(action, finalValue);
  }

  card.querySelector('[data-act="accept"]').addEventListener('click', () => resolve('accept', value));
  card.querySelector('[data-act="reject"]').addEventListener('click', () => resolve('reject', value));
  card.querySelector('[data-act="edit"]').addEventListener('click', () => {
    const bodyEl = document.getElementById(`${id}-body`);
    bodyEl.innerHTML = `
      <div>${label}:</div>
      <input type="text" class="aia-suggestion-edit-input" id="${id}-edit-input" value="${value}">
    `;
    const actionsEl = document.getElementById(`${id}-actions`);
    actionsEl.innerHTML = `<button type="button" class="aia-suggestion-btn accept" data-act="confirm-edit"><i class="fa-solid fa-check"></i> Save &amp; Accept</button>`;
    actionsEl.querySelector('[data-act="confirm-edit"]').addEventListener('click', () => {
      const edited = document.getElementById(`${id}-edit-input`).value.trim() || value;
      resolve('accept', edited);
    });
  });
}

/* ---- SCRIPTED CONVERSATION LOGIC (isolated on purpose — see file header) ---- */

/*
  getScriptedResponse(userText, stage) -> { reply, nextStage, suggestion?, statusUpdates? }

  This is the ONE function to replace with a real API call later. It never
  throws and never leaves the conversation without a reply — unmatched
  input always falls through to a generic acknowledgment.
*/
function getScriptedResponse(userText, stage) {
  const text = userText.trim();

  if (stage === 'awaiting-item') {
    // Loose heuristic: "<number> <word...>" — matches the spec's example
    // ("we need 50 laptops for the customer service team") without being a
    // real parser.
    const qtyMatch = text.match(/(\d+)\s+([a-zA-Z]+)/);
    if (qtyMatch) {
      const qty = qtyMatch[1];
      const itemNoun = qtyMatch[2];
      const forMatch = text.match(/for\s+(?:the\s+)?(.+?)[.?!]?$/i);
      const teamText = forMatch ? forMatch[1].trim() : 'the requesting team';
      return {
        reply: `Got it. I've captured the requirement for ${qty} ${itemNoun} for ${teamText}. I still need a few details to complete the request. Do you already have a project associated with this procurement?`,
        nextStage: 'awaiting-project',
        statusUpdates: [{ stepId: 'boq', status: 'in-progress' }],
        progressTo: 35,
        suggestion: {
          label: 'New BOQ item',
          value: `${qty} × ${itemNoun} — for ${teamText}`,
          onAccept: (finalValue) => {
            aia.acceptedValues.boqItem = { raw: finalValue, qty, itemNoun, teamText };
            setStepStatus('boq', 'complete');
          },
          onReject: () => setStepStatus('boq', 'not-started'),
        },
      };
    }
  }

  if (stage === 'awaiting-project') {
    if (/project|department|dept\.?/i.test(text)) {
      return {
        reply: `Thanks — noted. I won't ask for that again. You can keep describing requirements, or press "Continue with Form" any time to pick up in the full wizard.`,
        nextStage: 'general',
        statusUpdates: [{ stepId: 'basic-details', status: 'partially-complete' }],
        progressTo: 55,
        suggestion: {
          label: 'Department / project noted',
          value: text,
          onAccept: (finalValue) => {
            aia.acceptedValues.department = finalValue;
            setStepStatus('basic-details', 'complete');
          },
          onReject: () => setStepStatus('basic-details', 'not-started'),
        },
      };
    }
  }

  // Fallback — used for the 'general' stage and for any unmatched input at
  // any stage, so the conversation never looks stuck or broken.
  aia.progressPercent = Math.min(70, aia.progressPercent + 5);
  return {
    reply: `Thanks, I've noted that. Is there anything else you'd like to add before we continue?`,
    nextStage: stage === 'awaiting-item' ? stage : 'general',
    progressTo: aia.progressPercent,
  };
}

/* ---- Wiring the scripted logic into the chat UI ---- */

function handleSend() {
  const input = document.getElementById('aia-chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendMessage('user', escapeHtmlAia(text));

  const result = getScriptedResponse(text, aia.conversationStage);
  aia.conversationStage = result.nextStage;

  if (result.progressTo) bumpProgress(result.progressTo);
  (result.statusUpdates || []).forEach((u) => setStepStatus(u.stepId, u.status));

  setTimeout(() => {
    appendMessage('ai', escapeHtmlAia(result.reply));
    if (result.suggestion) {
      appendSuggestion({
        label: result.suggestion.label,
        value: escapeHtmlAia(result.suggestion.value),
        onResolve: (action, value) => {
          if (action === 'accept') result.suggestion.onAccept(value);
          else result.suggestion.onReject();
        },
      });
    }
  }, 400);
}

function escapeHtmlAia(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---- Continue with Form ---- */

function handleContinueWithForm() {
  const patch = {};
  if (aia.acceptedValues.boqItem) {
    const { qty, itemNoun, teamText } = aia.acceptedValues.boqItem;
    const existing = WizardStore.getFormData().boqItems || [];
    patch.boqItems = [
      ...existing,
      {
        id: `boq-aia-${Date.now().toString(36)}`,
        sourceImportId: null,
        name: itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1),
        description: `For ${teamText} (captured via AI Assistant).`,
        procurementType: 'Goods',
        purchaseGroup: null,
        materialGroup: null,
        uom: 'EA',
        quantity: Number(qty) || 1,
        unitPrice: 0,
        deliveryDate: null,
        hasBrandName: false,
        brandJustification: '',
      },
    ];
    patch.requestNameEn = WizardStore.getFormData().requestNameEn || `Procurement of ${itemNoun}`;
  }
  if (aia.acceptedValues.department) {
    patch.department = aia.acceptedValues.department;
  }

  if (Object.keys(patch).length > 0) {
    WizardStore.updateFormData(patch);
  }

  WizardStore.setStepStatus('basic-details', 'current');
  window.location.href = 'wizard-basic-details.html';
}

/* ---- Init ---- */

function initAiAssistant() {
  renderProgressPanel();

  document.getElementById('aia-continue-btn').addEventListener('click', handleContinueWithForm);
  document.getElementById('aia-send-btn').addEventListener('click', handleSend);
  document.getElementById('aia-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
  });

  appendMessage('ai', "Hi! I'll help you create your RFP. You can share information in any order - I'll organize it across the different sections and only ask for what's still needed. What are you looking to procure?");
}

document.addEventListener('DOMContentLoaded', initAiAssistant);
