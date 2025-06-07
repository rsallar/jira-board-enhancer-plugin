import '../styles/subtasks.css';

// --- LÓGICA DEL NUEVO SELECTOR DE ESTADO PERSONALIZADO ---

let customPopup = null; // Variable global para el panel
let activeTrigger = null; // El botón que abrió el panel

// Crea el panel flotante una sola vez y lo añade al body
export function initCustomStatusSelector() {
  if (document.getElementById('custom-status-popup')) return;
  customPopup = document.createElement('div');
  customPopup.id = 'custom-status-popup';
  document.body.appendChild(customPopup);

  // Listener para cerrar el popup si se clica fuera
  document.addEventListener('click', (e) => {
    if (customPopup.classList.contains('is-visible') && !customPopup.contains(e.target) && e.target !== activeTrigger) {
      customPopup.classList.remove('is-visible');
    }
  });

  // Listener para cerrar con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && customPopup.classList.contains('is-visible')) {
      customPopup.classList.remove('is-visible');
    }
  });
}

// Función que se ejecuta al hacer clic en un botón de estado
async function openCustomStatusSelector(e) {
  const triggerButton = e.currentTarget;
  const issueKey = triggerButton.dataset.issueKey;
  const currentStatus = triggerButton.dataset.originalStatus;

  // Si el popup ya está visible y fue abierto por este mismo botón, lo cerramos.
  if (customPopup.classList.contains('is-visible') && activeTrigger === triggerButton) {
    customPopup.classList.remove('is-visible');
    return;
  }
  
  activeTrigger = triggerButton;
  triggerButton.classList.add('is-loading');
  customPopup.innerHTML = ''; // Limpiamos contenido anterior

  const response = await new Promise(resolve => 
    chrome.runtime.sendMessage({ type: "GET_TRANSITIONS", issueKey }, resolve)
  );

  triggerButton.classList.remove('is-loading');

  if (!response || !response.success) {
    console.error(`Error al obtener estados para ${issueKey}.`);
    return;
  }

  // Creamos la lista de opciones
  const optionsList = document.createElement('ul');
  response.data.forEach(transition => {
    const listItem = document.createElement('li');
    const optionButton = document.createElement('button');
    optionButton.textContent = transition.name;
    optionButton.dataset.transitionId = transition.id;
    optionButton.dataset.newStatusName = transition.name;
    
    if (transition.name === currentStatus) {
      optionButton.classList.add('is-current-status');
      optionButton.disabled = true; // No se puede seleccionar el estado actual
    }

    optionButton.addEventListener('click', async () => {
      triggerButton.classList.add('is-loading');
      customPopup.classList.remove('is-visible');

      const setResponse = await new Promise(resolve => 
        chrome.runtime.sendMessage({ type: "SET_TRANSITION", issueKey, transitionId: optionButton.dataset.transitionId }, resolve)
      );

      triggerButton.classList.remove('is-loading');

      if (setResponse && setResponse.success) {
        // Actualizamos el botón con el nuevo estado
        triggerButton.querySelector('span').textContent = getShortStatus(optionButton.dataset.newStatusName);
        triggerButton.dataset.originalStatus = optionButton.dataset.newStatusName;
        triggerButton.title = `Estado: ${optionButton.dataset.newStatusName} (clic para cambiar)`;
      } else {
        console.error(`Error al cambiar el estado de ${issueKey}.`);
      }
    });

    listItem.appendChild(optionButton);
    optionsList.appendChild(listItem);
  });
  
  customPopup.appendChild(optionsList);

  // Posicionamos y mostramos el popup
  const rect = triggerButton.getBoundingClientRect();
  customPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
  customPopup.style.left = `${rect.left + window.scrollX}px`;
  customPopup.classList.add('is-visible');
}

// --- FUNCIONES HELPER (EXISTENTES Y NUEVAS) ---

function getShortStatus(statusName) {
  if (!statusName) return '';
  return statusName.split(' ')[0];
}

function createStatusSpan(issueKey, statusName) {
  const statusButton = document.createElement('button');
  statusButton.className = 'status-selector-trigger';
  statusButton.dataset.issueKey = issueKey;
  statusButton.dataset.originalStatus = statusName;
  statusButton.title = `Estado: ${statusName} (clic para cambiar)`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = getShortStatus(statusName);
  statusButton.appendChild(textSpan);
  
  statusButton.addEventListener('click', openCustomStatusSelector);
  return statusButton;
}

// --- FUNCIÓN DE RENDERIZADO PRINCIPAL (ACTUALIZADA) ---
function createSubtaskListDOM(subtasksData) {
    if (!subtasksData || subtasksData.length === 0) return null;
    const ul = document.createElement('ul');
    ul.className = 'subtask-list';
    subtasksData.forEach(subtask => {
        const li = document.createElement('li');
        li.className = 'subtask-item';
        li.addEventListener('click', (e) => e.stopPropagation());
        const mainContentSpan = document.createElement('span');
        mainContentSpan.className = 'subtask-item-main';
        const typeIcon = document.createElement('img');
        typeIcon.src = subtask.issueTypeIconUrl;
        typeIcon.alt = subtask.issueType;
        typeIcon.className = 'subtask-issuetype-icon';
        mainContentSpan.appendChild(typeIcon);
        const titleLink = document.createElement('a');
        titleLink.className = 'subtask-title-link';
        titleLink.textContent = subtask.title;
        titleLink.dataset.fullTitle = subtask.title;
        titleLink.href = subtask.url;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
        mainContentSpan.appendChild(titleLink);
        li.appendChild(mainContentSpan);
        const detailsSpan = document.createElement('span');
        detailsSpan.className = 'subtask-item-details';
        const statusButton = createStatusSpan(subtask.key, subtask.status);
        detailsSpan.appendChild(statusButton);
        if (subtask.avatarUrl) {
            const avatarImg = document.createElement('img');
            avatarImg.src = subtask.avatarUrl;
            avatarImg.alt = subtask.assigneeName;
            avatarImg.className = 'subtask-avatar';
            detailsSpan.appendChild(avatarImg);
        } else {
            const defaultAvatarContainer = document.createElement('span');
            defaultAvatarContainer.className = 'subtask-avatar default-assignee-icon';
            defaultAvatarContainer.title = 'Sin asignar';
            defaultAvatarContainer.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
                  <g fill="currentColor" fill-rule="evenodd">
                    <path d="M4.975 18.75a7.218 7.218 0 017.025-5.465 7.218 7.218 0 017.025 5.465.75.75 0 01-1.45.39A5.718 5.718 0 0012 14.816a5.718 5.718 0 00-5.55 4.324.75.75 0 11-1.45-.39zM12 12a4 4 0 110-8 4 4 0 010 8zm0-1.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>
                  </g>
                </svg>
            `;
            detailsSpan.appendChild(defaultAvatarContainer);
        }
        li.appendChild(detailsSpan);
        ul.appendChild(li);
    });
    return ul;
}

// --- FUNCIÓN DE PROCESAMIENTO DE TARJETAS (SIN CAMBIOS) ---
export async function processCards(cardElements) {
    const cardsToProcess = cardElements || document.querySelectorAll('div[data-testid="platform-board-kit.ui.card.card"]');
    for (const card of cardsToProcess) {
        if (card.dataset.subtasksProcessed === 'true') continue;
        const subtaskContainerSelector = 'div[data-testid="platform-card.common.ui.custom-fields.card-custom-field.html-card-custom-field-content.html-field"][data-issuefieldid="subtasks"]';
        const subtaskContainer = card.querySelector(subtaskContainerSelector);
        if (!subtaskContainer) {
            card.dataset.subtasksProcessed = 'true';
            continue;
        }
        const subtaskIssueKeys = (subtaskContainer.textContent.match(/[A-ZÁÉÍÓÚÑÜ]+-[0-9]+/gi) || []).map(k => k.toUpperCase());
        if (subtaskIssueKeys.length > 0) {
            const subtaskPromises = subtaskIssueKeys.map(issueKey => new Promise(resolve => {
                chrome.runtime.sendMessage({ type: "GET_SUBTASK_DETAILS", issueKey }, response => {
                    if (chrome.runtime.lastError) { resolve(null); return; }
                    resolve(response && response.success ? response.data : null);
                });
            }));
            const subtasksData = (await Promise.all(subtaskPromises)).filter(Boolean);
            if (subtasksData.length > 0) {
                const listElement = createSubtaskListDOM(subtasksData);
                if (listElement) {
                    subtaskContainer.innerHTML = '';
                    subtaskContainer.appendChild(listElement);
                }
            }
        }
        card.dataset.subtasksProcessed = 'true';
    }
}