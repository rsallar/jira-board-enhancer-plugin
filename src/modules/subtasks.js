import '../styles/subtasks.css'; // ¡Importamos su CSS directamente!

// --- SECCIÓN 1: RENDERIZADO DE SUBTAREAS ---
function createSubtaskListDOM(subtasksData) {
  if (!subtasksData || subtasksData.length === 0) return null;
  const ul = document.createElement('ul');
  ul.className = 'subtask-list';
  subtasksData.forEach(subtask => {
    const li = document.createElement('li');
    li.className = 'subtask-item';
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
    titleLink.href = subtask.url; // <-- Proviene de background.js
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    
    // --- ESTA ES LA PARTE IMPORTANTE ---
    titleLink.addEventListener('click', (e) => {
      // Detiene el burbujeo para que no se active el clic de la card padre.
      e.stopPropagation();
    });
    // --- FIN DE LA PARTE IMPORTANTE ---

    mainContentSpan.appendChild(titleLink);
    li.appendChild(mainContentSpan);
    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'subtask-item-details';
    const statusSpan = document.createElement('span');
    statusSpan.className = 'subtask-status';
    statusSpan.textContent = subtask.status;
    detailsSpan.appendChild(statusSpan);
    if (subtask.avatarUrl) {
      const avatarImg = document.createElement('img');
      avatarImg.src = subtask.avatarUrl;
      avatarImg.alt = subtask.assigneeName;
      avatarImg.className = 'subtask-avatar';
      detailsSpan.appendChild(avatarImg);
    } else {
        // ... (código del avatar por defecto) ...
    }
    li.appendChild(detailsSpan);
    ul.appendChild(li);
  });
  return ul;
}

async function processCards(cardElements) {
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