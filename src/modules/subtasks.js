import '../styles/subtasks.css';

// --- ¡NUEVO PATRÓN SINGLETON PARA EL ESTADO! ---
// Comprobamos si nuestro objeto de estado global ya existe.
// Si no existe, lo creamos. Esto solo se ejecutará la primera vez.
if (!window.JiraEnhancerState) {
  window.JiraEnhancerState = {
    customPopup: null,    // Referencia al panel del selector de estado
    activeTrigger: null,  // Referencia al botón que abrió el panel
  };
}
// ------------------------------------------------

// Ahora, en lugar de usar variables globales, usaremos las propiedades
// de nuestro objeto singleton: window.JiraEnhancerState.customPopup, etc.

export function initCustomStatusSelector() {
  if (document.getElementById('custom-status-popup')) return;
  // Usamos nuestro objeto de estado
  window.JiraEnhancerState.customPopup = document.createElement('div');
  window.JiraEnhancerState.customPopup.id = 'custom-status-popup';
  document.body.appendChild(window.JiraEnhancerState.customPopup);

  document.addEventListener('click', (e) => {
    const { customPopup, activeTrigger } = window.JiraEnhancerState;
    if (customPopup.classList.contains('is-visible') && !customPopup.contains(e.target) && e.target !== activeTrigger) {
      customPopup.classList.remove('is-visible');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.JiraEnhancerState.customPopup.classList.contains('is-visible')) {
      window.JiraEnhancerState.customPopup.classList.remove('is-visible');
    }
  });
}

async function openCustomStatusSelector(e) {
  // Obtenemos las referencias de nuestro objeto de estado
  const { customPopup } = window.JiraEnhancerState;
  let { activeTrigger } = window.JiraEnhancerState;

  const triggerButton = e.currentTarget;
  const issueKey = triggerButton.dataset.issueKey;
  const currentStatus = triggerButton.dataset.originalStatus;

  if (customPopup.classList.contains('is-visible') && activeTrigger === triggerButton) {
    customPopup.classList.remove('is-visible');
    return;
  }
  
  // Actualizamos el trigger activo en nuestro objeto de estado
  window.JiraEnhancerState.activeTrigger = triggerButton;
  activeTrigger = triggerButton; // Actualizamos la variable local también
  
  triggerButton.classList.add('is-loading');
  customPopup.innerHTML = '';

  const response = await new Promise(resolve => 
    chrome.runtime.sendMessage({ type: "GET_TRANSITIONS", issueKey }, resolve)
  );

  triggerButton.classList.remove('is-loading');
  if (!response || !response.success) {
    console.error(`Error al obtener estados para ${issueKey}.`);
    return;
  }

  const optionsList = document.createElement('ul');
  response.data.forEach(transition => {
    const listItem = document.createElement('li');
    const optionButton = document.createElement('button');
    optionButton.textContent = transition.name;
    optionButton.dataset.transitionId = transition.id;
    optionButton.dataset.newStatusName = transition.to.name;
    optionButton.dataset.newCategoryKey = transition.to.statusCategory.key;

    if (transition.name === currentStatus) {
      optionButton.classList.add('is-current-status');
      optionButton.disabled = true;
    }

    optionButton.addEventListener('click', async () => {
      triggerButton.classList.add('is-loading');
      customPopup.classList.remove('is-visible');

      const setResponse = await new Promise(resolve => 
        chrome.runtime.sendMessage({ type: "SET_TRANSITION", issueKey, transitionId: optionButton.dataset.transitionId }, resolve)
      );

      triggerButton.classList.remove('is-loading');

      if (setResponse && setResponse.success) {
        const newStatusName = optionButton.dataset.newStatusName;
        const newCategoryKey = optionButton.dataset.newCategoryKey;
        
        triggerButton.querySelector('span').textContent = getShortStatus(newStatusName);
        triggerButton.dataset.originalStatus = newStatusName;
        triggerButton.title = `Estado: ${newStatusName} (clic para cambiar)`;
        triggerButton.classList.remove('status-color-grey', 'status-color-blue', 'status-color-green');
        triggerButton.classList.add(getStatusCategoryClass(newCategoryKey));
      } else {
        console.error(`Error al cambiar el estado de ${issueKey}.`);
      }
    });

    listItem.appendChild(optionButton);
    optionsList.appendChild(listItem);
  });
  
  customPopup.appendChild(optionsList);
  const rect = triggerButton.getBoundingClientRect();
  customPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
  customPopup.style.left = `${rect.left + window.scrollX}px`;
  customPopup.classList.add('is-visible');
}

// --- FUNCIONES HELPER (EXISTENTES Y NUEVAS) ---

function getShortStatus(statusName) {
  if (!statusName) return '';

  const upperStatus = statusName.toUpperCase();

  if (upperStatus.length > 8) {
    // Si es más largo, corta a 8 caracteres y añade "..."
    return upperStatus.substring(0, 8) + '...';
  } else {
    // Si tiene 8 o menos, lo devuelve tal cual
    return upperStatus;
  }
}

// NUEVA FUNCIÓN para obtener la clase CSS según la categoría
function getStatusCategoryClass(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'status-color-green';
    case 'indeterminate': // 'In Progress', 'In Review', etc.
      return 'status-color-blue';
    case 'new': // 'To Do', 'Open', 'Backlog', etc.
    default:
      return 'status-color-grey';
  }
}

function createStatusSpan(issueKey, statusName, statusCategoryKey) {
  const statusButton = document.createElement('button');
  // Aplicamos la clase base y la clase de color
  statusButton.className = `status-selector-trigger ${getStatusCategoryClass(statusCategoryKey)}`;
  
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
        // --- 1. Crear el elemento de la fila y añadir el "escudo" anti-clic ---
        const li = document.createElement('li');
        li.className = 'subtask-item';
        li.addEventListener('click', (e) => e.stopPropagation());

        // --- 2. Crear la sección principal (icono de tipo + título) ---
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

        if (subtask.statusCategoryKey === 'done') {
            titleLink.classList.add('is-done');
        }

        mainContentSpan.appendChild(titleLink);

        li.appendChild(mainContentSpan);

        // --- 3. Crear la sección de detalles (estado + avatar) ---
        const detailsSpan = document.createElement('span');
        detailsSpan.className = 'subtask-item-details';

        // Usamos la función helper para crear el botón de estado con color
        const statusButton = createStatusSpan(subtask.key, subtask.status, subtask.statusCategoryKey);
        detailsSpan.appendChild(statusButton);

        // Lógica para mostrar el avatar del asignado o el avatar por defecto
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

        // --- 4. Añadir la fila completa a la lista ---
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