import '../styles/subtasks.css';


// --- NUEVA FUNCIÓN HELPER PARA TRUNCAR EL ESTADO ---
function getShortStatus(statusName) {
  if (!statusName) return '';
  return statusName.split(' ')[0]; // Divide por espacios y toma la primera palabra
}

async function showStatusSelector(e) {
  const statusSpan = e.target;
  const issueKey = statusSpan.dataset.issueKey;
  const originalParent = statusSpan.parentElement;
  const fullStatus = statusSpan.dataset.originalStatus; // El estado completo

  statusSpan.textContent = '...';
  statusSpan.classList.remove('is-actionable');

  const response = await new Promise(resolve => 
    chrome.runtime.sendMessage({ type: "GET_TRANSITIONS", issueKey }, resolve)
  );

  if (!response || !response.success) {
    console.error(`Error al obtener estados para ${issueKey}.`);
    statusSpan.textContent = getShortStatus(fullStatus); // Usa el helper
    statusSpan.classList.add('is-actionable');
    return;
  }
  
  const select = document.createElement('select');
  select.className = 'subtask-status-select';
  
  const currentOption = document.createElement('option');
  currentOption.disabled = true;
  currentOption.selected = true;
  currentOption.textContent = fullStatus; // En el dropdown, mostramos el nombre completo
  select.appendChild(currentOption);
  
  response.data.forEach(transition => {
    const option = document.createElement('option');
    option.value = transition.id;
    option.textContent = transition.name; // El nombre completo en las opciones
    select.appendChild(option);
  });
  
  originalParent.replaceChild(select, statusSpan);
  select.focus();

  const handleSelectChange = async () => {
    if (!select.value) return;
    const transitionId = select.value;
    const newStatusName = select.options[select.selectedIndex].text;
    
    select.disabled = true;

    const setResponse = await new Promise(resolve => 
      chrome.runtime.sendMessage({ type: "SET_TRANSITION", issueKey, transitionId }, resolve)
    );

    if (setResponse && setResponse.success) {
      const newStatusSpan = createStatusSpan(issueKey, newStatusName);
      originalParent.replaceChild(newStatusSpan, select);
    } else {
      console.error(`Error al cambiar el estado de ${issueKey}.`);
      originalParent.replaceChild(statusSpan, select);
      statusSpan.textContent = getShortStatus(fullStatus); // Usa el helper
      statusSpan.classList.add('is-actionable');
    }
  };

  const revertToSpan = () => {
    if (!select.disabled) {
        originalParent.replaceChild(statusSpan, select);
        statusSpan.textContent = getShortStatus(fullStatus); // Usa el helper
        statusSpan.classList.add('is-actionable');
    }
  };

  select.addEventListener('change', handleSelectChange);
  select.addEventListener('blur', revertToSpan);
  select.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') revertToSpan();
  });
}

// --- createStatusSpan (Modificado para usar el helper) ---
function createStatusSpan(issueKey, statusName) {
  const statusSpan = document.createElement('span');
  statusSpan.className = 'subtask-status is-actionable';
  
  // --- ¡AQUÍ ESTÁ LA MODIFICACIÓN PRINCIPAL! ---
  statusSpan.textContent = getShortStatus(statusName);
  
  // Guardamos el nombre completo en el dataset para usarlo después
  statusSpan.dataset.issueKey = issueKey;
  statusSpan.dataset.originalStatus = statusName; 
  
  statusSpan.title = `Estado: ${statusName} (clic para cambiar)`; // Tooltip mejorado
  statusSpan.addEventListener('click', showStatusSelector);
  return statusSpan;
}

// --- FUNCIÓN PRINCIPAL DE RENDERIZADO (ACTUALIZADA) ---
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
    
    // Usamos la nueva función helper para el estado
    const statusSpan = createStatusSpan(subtask.key, subtask.status);
    detailsSpan.appendChild(statusSpan);

    // Lógica para el avatar (con el caso por defecto)
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