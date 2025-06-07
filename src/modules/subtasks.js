import '../styles/subtasks.css'; // ¡Importamos su CSS directamente!

// --- SECCIÓN 1: RENDERIZADO DE SUBTAREAS ---
function createSubtaskListDOM(subtasksData) {
  if (!subtasksData || subtasksData.length === 0) return null;
  const ul = document.createElement('ul');
  ul.className = 'subtask-list';
  
  subtasksData.forEach(subtask => {
    // ... tu código para crear li, mainContentSpan, etc. no cambia ...
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
    titleLink.href = subtask.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    mainContentSpan.appendChild(titleLink);
    li.appendChild(mainContentSpan);
    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'subtask-item-details';
    const statusSpan = document.createElement('span');
    statusSpan.className = 'subtask-status';
    statusSpan.textContent = subtask.status;
    detailsSpan.appendChild(statusSpan);

    if (subtask.avatarUrl) {
      // Caso 1: Hay un asignado, mostramos su imagen.
      const avatarImg = document.createElement('img');
      avatarImg.src = subtask.avatarUrl;
      avatarImg.alt = subtask.assigneeName;
      avatarImg.className = 'subtask-avatar';
      detailsSpan.appendChild(avatarImg);
    } else {
      // --- CASO 2: NO HAY ASIGNADO ---
      // Creamos el avatar por defecto.

      // 1. Creamos el contenedor del avatar. Le damos la misma clase
      //    que a la imagen para que tenga el mismo tamaño y forma (círculo gris).
      const defaultAvatarContainer = document.createElement('span');
      defaultAvatarContainer.className = 'subtask-avatar default-assignee-icon'; // Añadimos la clase para el color del icono
      defaultAvatarContainer.title = 'Sin asignar'; // Tooltip para accesibilidad

      // 2. Insertamos el código SVG del icono dentro del contenedor.
      //    Usamos `innerHTML` porque es la forma más directa de insertar un bloque de SVG.
      defaultAvatarContainer.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
          <g fill="currentColor" fill-rule="evenodd">
            <path d="M4.975 18.75a7.218 7.218 0 017.025-5.465 7.218 7.218 0 017.025 5.465.75.75 0 01-1.45.39A5.718 5.718 0 0012 14.816a5.718 5.718 0 00-5.55 4.324.75.75 0 11-1.45-.39zM12 12a4 4 0 110-8 4 4 0 010 8zm0-1.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>
          </g>
        </svg>
      `;

      // 3. Añadimos el nuevo avatar por defecto al DOM.
      detailsSpan.appendChild(defaultAvatarContainer);
    }
    
    li.appendChild(detailsSpan);
    ul.appendChild(li);
  });
  
  return ul;
}

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