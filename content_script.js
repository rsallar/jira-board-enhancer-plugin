// Función para crear el elemento DOM de la tabla para una subtarea
// En content_script.js

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

    const titleTextSpan = document.createElement('span');
    titleTextSpan.className = 'subtask-title-text';
    titleTextSpan.textContent = subtask.title;
    titleTextSpan.title = subtask.title;
    mainContentSpan.appendChild(titleTextSpan);

    li.appendChild(mainContentSpan);

    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'subtask-item-details';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'subtask-status';
    statusSpan.textContent = subtask.status;
    detailsSpan.appendChild(statusSpan);

    if (subtask.avatarUrl) { // Si hay una URL de avatar específica
      const avatarImg = document.createElement('img');
      avatarImg.src = subtask.avatarUrl;
      avatarImg.alt = subtask.assigneeName;
      avatarImg.title = subtask.assigneeName;
      avatarImg.className = 'subtask-avatar'; // Usará los estilos de .subtask-avatar
      detailsSpan.appendChild(avatarImg);
    } else { // No hay avatarUrl, usamos el SVG por defecto para "Sin asignar"
      const defaultAvatarContainer = document.createElement('span');
      // Aplicamos la clase .subtask-avatar para heredar tamaño y forma,
      // y una clase específica para el color del SVG.
      defaultAvatarContainer.className = 'subtask-avatar default-assignee-icon';
      defaultAvatarContainer.setAttribute('role', 'img');
      defaultAvatarContainer.setAttribute('aria-label', subtask.assigneeName || 'Sin asignar');
      defaultAvatarContainer.title = subtask.assigneeName || 'Sin asignar';

      // Crear el SVG y sus componentes
      const svgNS = "http://www.w3.org/2000/svg";
      const svgEl = document.createElementNS(svgNS, "svg");
      svgEl.setAttribute("viewBox", "0 0 24 24");
      svgEl.setAttribute("role", "presentation");
      // El tamaño del SVG se controlará por CSS para que llene el contenedor .default-assignee-icon

      const gEl = document.createElementNS(svgNS, "g");
      gEl.setAttribute("fill", "currentColor"); // El color será heredado del CSS de .default-assignee-icon
      gEl.setAttribute("fill-rule", "evenodd");

      const pathEl = document.createElementNS(svgNS, "path");
      pathEl.setAttribute("d", "M6 14c0-1.105.902-2 2.009-2h7.982c1.11 0 2.009.894 2.009 2.006v4.44c0 3.405-12 3.405-12 0z");
      
      const circleEl = document.createElementNS(svgNS, "circle");
      circleEl.setAttribute("cx", "12");
      circleEl.setAttribute("cy", "7");
      circleEl.setAttribute("r", "4");

      gEl.appendChild(pathEl);
      gEl.appendChild(circleEl);
      svgEl.appendChild(gEl);
      defaultAvatarContainer.appendChild(svgEl);
      detailsSpan.appendChild(defaultAvatarContainer);
    }
    li.appendChild(detailsSpan);
    ul.appendChild(li);
  });
  return ul;
}

// Función principal para procesar las tarjetas
// Acepta un argumento opcional: un array de elementos de tarjeta a procesar.
// Si no se provee, procesa todas las tarjetas encontradas en el documento.
async function processCards(cardElements) {
  const cardsToProcess = cardElements || document.querySelectorAll('div[data-testid="platform-board-kit.ui.card.card"]');
  
  if (cardElements) {
    console.log(`Jira Enhancer: Processing ${cardsToProcess.length} specific new card(s).`);
  } else {
    console.log(`Jira Enhancer: Starting full scan. Found ${cardsToProcess.length} cards to potentially process.`);
  }

  for (const card of cardsToProcess) {
    if (card.dataset.subtasksProcessed === 'true') {
      continue;
    }

    const subtaskContainerSelector = 'div[data-testid="platform-card.common.ui.custom-fields.card-custom-field.html-card-custom-field-content.html-field"][data-issuefieldid="subtasks"]';
    const subtaskContainer = card.querySelector(subtaskContainerSelector);
    const subtaskIssueKeys = [];

    if (subtaskContainer) {
      const allTextContent = subtaskContainer.textContent;
      const issueKeyRegex = /[A-ZÁÉÍÓÚÑÜ]+-[0-9]+/gi;
      let match;
      while ((match = issueKeyRegex.exec(allTextContent)) !== null) {
        subtaskIssueKeys.push(match[0].toUpperCase());
      }
    } else {
      continue; 
    }

    if (subtaskIssueKeys.length > 0) {
      const subtaskPromises = [];
      subtaskIssueKeys.forEach(issueKey => {
        subtaskPromises.push(
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_SUBTASK_DETAILS", issueKey: issueKey }, (response) => {
              if (chrome.runtime.lastError) {
                console.error(`Jira Enhancer: sendMessage error for ${issueKey}: ${chrome.runtime.lastError.message}`);
                resolve(null);
                return;
              }
              if (response && response.success) {
                resolve(response.data);
              } else {
                console.warn(`Jira Enhancer: Failed to get details for ${issueKey} from background.`, response ? response.error : 'No response or error in background.');
                resolve(null);
              }
            });
          })
        );
      });

      const subtasksData = (await Promise.all(subtaskPromises)).filter(Boolean);

      if (subtasksData.length > 0) {
        const listElement = createSubtaskListDOM(subtasksData); // Usamos la nueva función

        if (listElement && subtaskContainer) {
          // Decidimos que el subtaskContainer (el div con data-issuefieldid="subtasks")
          // contendrá directamente nuestra lista UL.
          // Mantenemos sus estilos originales, pero limpiamos su contenido y añadimos la lista.
          // Si el div original `subtaskContainer` tenía un padding/borde que queremos eliminar
          // para esta nueva lista, podríamos añadir una clase específica a subtaskContainer
          // cuando lo modificamos, o envolver listElement en otro div.
          // Por ahora, lo más simple:
          subtaskContainer.innerHTML = ''; // Limpiar IDs originales
          subtaskContainer.appendChild(listElement); // Añadir la nueva lista UL
          
          // Opcional: Añadir una clase al contenedor para indicar que ha sido modificado
          // y para aplicar estilos específicos si el div[data-issuefieldid="subtasks"]
          // necesita diferentes estilos cuando contiene nuestra lista.
          // subtaskContainer.classList.add('custom-subtasks-rendered');
        }
        card.dataset.subtasksProcessed = 'true';
      } else {
        card.dataset.subtasksProcessed = 'true'; 
      }
    } else if (subtaskContainer) {
        card.dataset.subtasksProcessed = 'true';
    }
  }
}

// --- CONFIGURACIÓN DEL MUTATIONOBSERVER ---
const observer = new MutationObserver((mutationsList) => {
  let newCardElements = [];
  mutationsList.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // ¿Es el nodo añadido directamente una tarjeta?
          if (node.matches('div[data-testid="platform-board-kit.ui.card.card"]')) {
            newCardElements.push(node);
          }
          // ¿El nodo añadido CONTIENE tarjetas? (ej. se añadió una columna entera)
          const containedCards = node.querySelectorAll('div[data-testid="platform-board-kit.ui.card.card"]');
          if (containedCards.length > 0) {
            newCardElements.push(...containedCards); // El operador 'spread' (...) añade todos los elementos del array
          }
        }
      });
    }
  });

  if (newCardElements.length > 0) {
    // Eliminar duplicados si una tarjeta se captura de múltiples maneras
    const uniqueNewCards = [...new Set(newCardElements)];
    console.log(`Jira Enhancer: MutationObserver detected ${uniqueNewCards.length} new card(s) or cards within new nodes. Processing them.`);
    processCards(uniqueNewCards); // Procesar solo estas tarjetas nuevas/detectadas
  }
});

// Iniciar la observación del contenedor del tablero
const boardSelector = 'div[data-onboarding-observer-id="board-wrapper"]';
const boardContainer = document.querySelector(boardSelector);

if (boardContainer) {
    console.log("Jira Enhancer: Found board container with selector:", boardSelector, ". Initializing MutationObserver.");
    observer.observe(boardContainer, { childList: true, subtree: true });
} else {
    // Fallback si no se encuentra el contenedor específico. Debería encontrarse con el selector correcto.
    console.warn(`Jira Enhancer: Board container not found with selector '${boardSelector}'. Falling back to observing document.body. This may be less efficient and could pick up non-board changes.`);
    observer.observe(document.body, { childList: true, subtree: true });
}

// --- LLAMADA INICIAL PARA PROCESAR TARJETAS YA PRESENTES AL CARGAR ---
window.addEventListener('load', () => {
    console.log('Jira Enhancer: Page loaded, scheduling initial full card processing pass...');
    setTimeout(() => {
        console.log('Jira Enhancer: Executing initial full card processing pass.');
        processCards(); // Llama sin argumentos para procesar todas las tarjetas existentes
    }, 3000); // Espera 3 segundos (ajusta si es necesario)
});

console.log('Jira Enhancer content script loaded (MutationObserver active, new subtask ID logic).');