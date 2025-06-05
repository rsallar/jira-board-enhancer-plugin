// Función para crear el elemento DOM de la tabla para una subtarea
// En content_script.js

/**
 * Gestiona el estado colapsado/expandido de las columnas del tablero de Jira.
 */
const JIRA_COLUMN_STATE_KEY = 'jiraColumnHorizontalCollapseState';

function getColumnCollapseState() {
  try {
    const state = localStorage.getItem(JIRA_COLUMN_STATE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (e) {
    console.error('Jira Enhancer: Error reading column state from localStorage', e);
    return {};
  }
}

function setColumnCollapseState(columnTitle, isCollapsed) {
  const state = getColumnCollapseState();
  state[columnTitle] = isCollapsed;
  try {
    localStorage.setItem(JIRA_COLUMN_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Jira Enhancer: Error saving column state to localStorage', e);
  }
}

function initializeHorizontalCollapse() {
  const columnSelector = 'div[data-component-selector="platform-board-kit.ui.column.draggable-column"]';
  const columns = document.querySelectorAll(columnSelector);
  const collapseState = getColumnCollapseState();

  columns.forEach(column => {
    if (column.dataset.horizontalCollapseInitialized === 'true') {
      return;
    }

    const header = column.querySelector('div[data-testid="platform-board-kit.common.ui.column-header.header.column-header-container"]');
    const cardList = column.querySelector('ul[data-testid*="fast-virtual-list-wrapper"]');
    const titleElement = header ? header.querySelector('h2[aria-label]') : null;

    if (!header || !cardList || !titleElement) return;

    const columnTitle = titleElement.getAttribute('aria-label');
    if (!columnTitle) return;

    // Marcar la lista de tarjetas para poder ocultarla con CSS
    cardList.classList.add('horizontally-collapsible-card-list');

    // --- Envolver el contenido original de la cabecera para poder ocultarlo ---
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'original-header-content-wrapper';
    while (header.firstChild) {
      headerWrapper.appendChild(header.firstChild);
    }
    header.appendChild(headerWrapper);
    
    // --- Crear el título vertical que se mostrará cuando la columna esté colapsada ---
    const verticalTitle = document.createElement('div');
    verticalTitle.className = 'vertical-column-title';
    verticalTitle.textContent = columnTitle;
    column.appendChild(verticalTitle); // Lo añadimos al contenedor principal de la columna

    // --- Crear el botón de colapso/expansión ---
    const btn = document.createElement('button');
    btn.className = 'horizontal-collapse-btn';
    btn.setAttribute('aria-label', `Colapsar/Expandir columna ${columnTitle}`);
    btn.title = 'Colapsar/Expandir';
    btn.innerHTML = `
      <svg class="icon-collapse" width="16" height="16" viewBox="0 0 24 24"><path d="M14 17.364l-6.73-5.364 6.73-5.364v10.728z" fill="currentColor"/></svg>
      <svg class="icon-expand" width="16" height="16" viewBox="0 0 24 24"><path d="M10 17.364v-10.728l6.73 5.364-6.73 5.364z" fill="currentColor"/></svg>
    `;

    // Insertar el botón en la cabecera (fuera del wrapper)
    header.prepend(btn);

    // --- Aplicar el estado guardado al cargar ---
    if (collapseState[columnTitle]) {
      column.classList.add('is-horizontally-collapsed');
    }

    // --- Añadir el listener de clic ---
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const isNowCollapsed = column.classList.toggle('is-horizontally-collapsed');
      setColumnCollapseState(columnTitle, isNowCollapsed);
    });

    column.dataset.horizontalCollapseInitialized = 'true';
  });
}


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
  let newColumnsFound = false;

  mutationsList.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches('div[data-testid="platform-board-kit.ui.card.card"]')) { newCardElements.push(node); }
          const containedCards = node.querySelectorAll('div[data-testid="platform-board-kit.ui.card.card"]');
          if (containedCards.length > 0) { newCardElements.push(...containedCards); }

          const columnSelector = 'div[data-component-selector="platform-board-kit.ui.column.draggable-column"]';
          if (node.matches(columnSelector) || node.querySelector(columnSelector)) {
            newColumnsFound = true;
          }
        }
      });
    }
  });

  if (newCardElements.length > 0) {
    const uniqueNewCards = [...new Set(newCardElements)];
    processCards(uniqueNewCards);
  }

  if (newColumnsFound) {
    console.log('Jira Enhancer: MutationObserver detected new column(s). Initializing horizontal collapse.');
    initializeHorizontalCollapse();
  }
});

// Iniciar la observación del contenedor del tablero
//const boardSelector = 'div[data-onboarding-observer-id="board-wrapper"]';
const boardSelector = 'div[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]';
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
    console.log('Jira Enhancer: Page loaded, scheduling initial processing...');
    setTimeout(() => {
        processCards(); 
        initializeHorizontalCollapse(); // Llamamos a la nueva función
    }, 3000); 
});

console.log('Jira Enhancer content script loaded (MutationObserver active, new subtask ID logic).');