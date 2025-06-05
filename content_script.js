// Función para crear el elemento DOM de la tabla para una subtarea
function createSubtaskTableElement(subtasksData) {
  if (!subtasksData || subtasksData.length === 0) return null;

  const table = document.createElement('table');
  table.className = 'subtask-table'; // Asegúrate de tener estilos CSS para esta clase

  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  ['Título', 'Estado', 'Asignado'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });

  const tbody = table.createTBody();
  subtasksData.forEach(subtask => {
    const row = tbody.insertRow();

    const titleCell = row.insertCell();
    const typeIcon = document.createElement('img');
    typeIcon.src = subtask.issueTypeIconUrl;
    typeIcon.alt = subtask.issueType;
    typeIcon.className = 'subtask-issuetype-icon';
    titleCell.appendChild(typeIcon);
    titleCell.appendChild(document.createTextNode(` ${subtask.title}`));

    row.insertCell().textContent = subtask.status;

     const assigneeCell = row.insertCell();
    if (subtask.avatarUrl) {
      const avatarImg = document.createElement('img');
      avatarImg.src = subtask.avatarUrl;
      avatarImg.alt = subtask.assigneeName;    // Importante para accesibilidad
      avatarImg.title = subtask.assigneeName;  // Añade tooltip con el nombre al pasar el ratón
      avatarImg.className = 'subtask-avatar';
      assigneeCell.appendChild(avatarImg);
    } else {
      // Si no hay avatarUrl, la celda quedará vacía.
      // Si quisieras mostrar "Sin asignar" o un ícono para casos sin avatar:
       if (subtask.assigneeName === 'Sin asignar') {
         assigneeCell.textContent = '—'; // O un ícono de "sin asignar"
       }
    }
    
  });

  return table;
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
      // console.log(`Jira Enhancer: Card ${card.id || '(no id)'} already processed, skipping.`);
      continue;
    }

    const subtaskContainerSelector = 'div[data-testid="platform-card.common.ui.custom-fields.card-custom-field.html-card-custom-field-content.html-field"][data-issuefieldid="subtasks"]';
    const subtaskContainer = card.querySelector(subtaskContainerSelector);
    const subtaskIssueKeys = [];

    if (subtaskContainer) {
      // console.log(`Jira Enhancer: Found subtask container in card ${card.id || '(no id)'}. Content: "${subtaskContainer.textContent.trim()}"`);
      const allTextContent = subtaskContainer.textContent;
      const issueKeyRegex = /[A-ZÁÉÍÓÚÑÜ]+-[0-9]+/gi;
      let match;
      while ((match = issueKeyRegex.exec(allTextContent)) !== null) {
        subtaskIssueKeys.push(match[0].toUpperCase());
      }
      // if (subtaskIssueKeys.length > 0) {
      //   console.log(`Jira Enhancer: Extracted subtask keys: [${subtaskIssueKeys.join(', ')}] from card ${card.id || '(no id)'}`);
      // }
    } else {
      // No se encontró el contenedor de subtareas, esta tarjeta no tiene subtareas de la forma esperada.
      // Marcamos como procesada para no volver a chequearla si es parte de un full scan.
      // card.dataset.subtasksProcessed = 'true'; // Opcional: si quieres evitar incluso el chequeo del selector en futuros full scans.
      continue; // Pasar a la siguiente tarjeta si no hay contenedor
    }

    if (subtaskIssueKeys.length > 0) {
      const subtaskPromises = [];
      subtaskIssueKeys.forEach(issueKey => {
        // console.log(`Jira Enhancer: Preparing to fetch details for subtask ID: ${issueKey} from card ${card.id || '(no id)'}`);
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
        // console.log(`Jira Enhancer: Successfully fetched data for ${subtasksData.length} subtasks of card ${card.id || '(no id)'}. Creating table.`);
        const tableElement = createSubtaskTableElement(subtasksData);

        if (tableElement && subtaskContainer) {
          subtaskContainer.innerHTML = '';
          subtaskContainer.appendChild(tableElement);
          // console.log(`Jira Enhancer: Subtask table injected into subtask container for card ${card.id || '(no id)'}.`);
        }
        card.dataset.subtasksProcessed = 'true';
      } else {
        // console.log(`Jira Enhancer: No valid subtask data obtained for card ${card.id || '(no id)'} after fetching. No table will be added.`);
        // Si se encontraron issue keys pero no se obtuvieron datos, igual marcamos como procesado para no reintentar.
        card.dataset.subtasksProcessed = 'true';
      }
    } else if (subtaskContainer) {
        // El contenedor existía pero no se extrajeron IDs (ej. estaba vacío o con texto no parseable)
        // Marcamos como procesada para no volver a analizar este contenedor vacío.
        // console.log(`Jira Enhancer: Subtask container in card ${card.id || '(no id)'} had no parsable issue keys.`);
        card.dataset.subtasksProcessed = 'true';
    }
    // Si subtaskContainer no existía, ya se hizo 'continue'.
  }
  // console.log("Jira Enhancer: Finished processing pass.");
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