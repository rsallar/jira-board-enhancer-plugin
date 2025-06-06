/**
 * ==============================================================================
 * JIRA SUBTASK ENHANCER
 * ==============================================================================
 * Funcionalidades:
 * 1. Reemplaza los IDs de subtareas por una lista detallada (título, estado, avatar).
 * 2. Permite colapsar/expandir horizontalmente las columnas del tablero.
 * 3. Guarda el estado de las columnas colapsadas.
 */

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
    if (subtask.avatarUrl) {
      const avatarImg = document.createElement('img');
      avatarImg.src = subtask.avatarUrl;
      avatarImg.alt = subtask.assigneeName;
      avatarImg.title = subtask.assigneeName;
      avatarImg.className = 'subtask-avatar';
      detailsSpan.appendChild(avatarImg);
    } else {
      const defaultAvatarContainer = document.createElement('span');
      defaultAvatarContainer.className = 'subtask-avatar default-assignee-icon';
      defaultAvatarContainer.setAttribute('role', 'img');
      defaultAvatarContainer.setAttribute('aria-label', subtask.assigneeName || 'Sin asignar');
      defaultAvatarContainer.title = subtask.assigneeName || 'Sin asignar';
      const svgNS = "http://www.w3.org/2000/svg";
      const svgEl = document.createElementNS(svgNS, "svg");
      svgEl.setAttribute("viewBox", "0 0 24 24");
      svgEl.setAttribute("role", "presentation");
      const gEl = document.createElementNS(svgNS, "g");
      gEl.setAttribute("fill", "currentColor");
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
          if (chrome.runtime.lastError) {
            console.error(`Jira Enhancer: sendMessage error for ${issueKey}: ${chrome.runtime.lastError.message}`);
            resolve(null);
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            resolve(null);
          }
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

// --- SECCIÓN 2: LÓGICA DE COLUMNAS COLAPSABLES HORIZONTALMENTE ---

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

function updateGridLayout() {
  const firstColumn = document.querySelector('div[data-component-selector="platform-board-kit.ui.column.draggable-column"]');
  if (!firstColumn) return;
  const gridParent = firstColumn.parentElement;
  if (!gridParent) return;

  const columns = Array.from(gridParent.children);
  let templateColumns = [];

  for (const column of columns) {
    if (column.matches('div[data-component-selector="platform-board-kit.ui.column.draggable-column"]')) {
      if (column.classList.contains('is-horizontally-collapsed')) {
        templateColumns.push('40px');
      } else {
        templateColumns.push('minmax(250px, 1fr)');
      }
    }
  }

  if (templateColumns.length > 0) {
    gridParent.style.gridTemplateColumns = templateColumns.join(' ');
    gridParent.style.gridAutoColumns = ''; // Anular posible estilo por defecto de Jira
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
    const cardList = column.querySelector('ul[data-testid*="fast-virtual-list-wrapper"]'); // La variable se declara como cardList (con L mayúscula)
    const titleElement = header ? header.querySelector('h2[aria-label]') : null;

    if (!header || !cardList || !titleElement) {
      return; 
    }
    

    cardList.classList.add('horizontally-collapsible-card-list');

    const columnTitle = titleElement.getAttribute('aria-label');
    if (!columnTitle) return;

    // Envolver el contenido original de la cabecera para poder ocultarlo
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'original-header-content-wrapper';
    while (header.firstChild) {
      headerWrapper.appendChild(header.firstChild);
    }
    header.appendChild(headerWrapper);
    
    // Crear el título vertical que se mostrará cuando la columna esté colapsada
    const verticalTitle = document.createElement('div');
    verticalTitle.className = 'vertical-column-title';
    verticalTitle.textContent = columnTitle;
    column.appendChild(verticalTitle);

    // Crear el botón de colapso/expansión
    const btn = document.createElement('button');
    btn.className = 'horizontal-collapse-btn';
    btn.setAttribute('aria-label', `Colapsar/Expandir columna ${columnTitle}`);
    btn.title = 'Colapsar/Expandir';
    btn.innerHTML = `<svg class="icon-collapse" viewBox="0 0 24 24"><path d="M14 17.364l-6.73-5.364 6.73-5.364v10.728z" fill="currentColor"/></svg><svg class="icon-expand" viewBox="0 0 24 24"><path d="M10 17.364v-10.728l6.73 5.364-6.73 5.364z" fill="currentColor"/></svg>`;
    
    // Insertar el botón en la cabecera (fuera del wrapper)
    //header.prepend(btn);
    //header.appendChild(btn);
    column.appendChild(btn);

    // Aplicar el estado guardado al cargar
    if (collapseState[columnTitle]) {
      column.classList.add('is-horizontally-collapsed');
    }

    // Añadir el listener de clic
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const isNowCollapsed = column.classList.toggle('is-horizontally-collapsed');
      setColumnCollapseState(columnTitle, isNowCollapsed);
      updateGridLayout();
    });

    column.dataset.horizontalCollapseInitialized = 'true';
  });

  updateGridLayout(); // Llamada inicial para establecer el layout correcto
}


// --- SECCIÓN 3: INICIALIZACIÓN Y MUTATION OBSERVER ---

const observer = new MutationObserver((mutationsList) => {
  let newCardElements = [];
  let newColumnsFound = false;
  mutationsList.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const cardSelector = 'div[data-testid="platform-board-kit.ui.card.card"]';
          if (node.matches(cardSelector)) { newCardElements.push(node); }
          const containedCards = node.querySelectorAll(cardSelector);
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
    processCards([...new Set(newCardElements)]);
  }

  if (newColumnsFound) {
    initializeHorizontalCollapse();
  }
});

const boardSelector = 'div[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]';
const boardContainer = document.querySelector(boardSelector);
if(boardContainer) {
    observer.observe(boardContainer, { childList: true, subtree: true });
} else {
    observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('load', () => {
    setTimeout(() => {
        processCards();
        initializeHorizontalCollapse();
    }, 3000); 
});

console.log('Jira Enhancer loaded with all features.');