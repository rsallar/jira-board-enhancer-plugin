/**
 * ==============================================================================
 * JIRA SUBTASK & COLUMN ENHANCER (v8 - Versión Completa y Corregida)
 * ==============================================================================
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
    const titleLink = document.createElement('a');
    titleLink.className = 'subtask-title-link';
    titleLink.textContent = subtask.title;
    titleLink.title = subtask.title;
    titleLink.href = subtask.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.addEventListener('click', (e) => e.stopPropagation());
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

/**
 * Actualiza el layout de un contenedor grid.
 * @param {HTMLElement} gridParent El elemento que tiene display:grid.
 */
function updateGridLayout(gridParent, columns) {
    if (!gridParent) return;
    
    if(!hideMode){
        gridParent.style.gridTemplateColumns = "minmax(250px, 1fr)".repeat(columns.length);
    }else{
        gridParent.style.gridTemplateColumns = "40px "+ "minmax(250px, 1fr) ".repeat(columns.length-1);
    }

    const firstHeader = document.querySelector(headerSelector);
    const collapseBtn = document.querySelector('[id=collapseBtn]');
    if (hideMode){ 
        firstHeader.parentElement.parentElement.parentElement.parentElement.style.gridTemplateColumns = "minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)";   
        collapseBtn.classList.remove("btnCollapsed");
        collapseBtn.parentElement.firstChild.classList.remove("hide");
    }else{
        firstHeader.parentElement.parentElement.parentElement.parentElement.style.gridTemplateColumns = "40px minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)";
        collapseBtn.classList.add("btnCollapsed");
        collapseBtn.parentElement.firstChild.classList.add("hide");
    }

}

const headerSelector = '[data-testid="platform-board-kit.common.ui.column-header.header.column-header-container"]'; 
const headerTextSelector = '[data-testid="platform-board-kit.common.ui.column-header.editable-title.column-title.column-title"]';
const columnWrapperSelector = '[data-testid="platform-board-kit.ui.column.draggable-column.styled-wrapper"]';
const swimlaneColumnsContainerSelector = '[data-testid="platform-board-kit.ui.swimlane.swimlane-columns"]';
let hideMode = false;

/**
 * Función principal que inicializa la funcionalidad de colapso.
 */
function initCollapsibleFirstColumn() {

    // Encontrar TODAS las primeras columnas de cada swimlane
    const swimlaneContainers = document.querySelectorAll(swimlaneColumnsContainerSelector);
    console.log("filas:", swimlaneContainers.length);
    
    const columns = Array.from(swimlaneContainers).map(container =>
        container.querySelector(columnWrapperSelector) // .querySelector siempre devuelve el primero que encuentra
    ).filter(Boolean); // Filtra cualquier resultado nulo si un swimlane estuviera vacío

    const firstHeaderText = document.querySelector(headerTextSelector);
    if (!firstHeaderText) {
        // console.log("Jira Collapser: No se encontró la cabecera principal.");
        return;
    }
     
    const btn = document.createElement('button');
    btn.id = 'collapseBtn'
    btn.className = 'horizontal-collapse-btn';
    btn.title = 'Colapsar/Expandir';
    btn.innerHTML = `<svg class="icon-collapse" viewBox="0 0 24 24"><path d="M14 17.364l-6.73-5.364 6.73-5.364v10.728z" fill="currentColor"/></svg><svg class="icon-expand" viewBox="0 0 24 24"><path d="M10 17.364v-10.728l6.73 5.364-6.73 5.364z" fill="currentColor"/></svg>`;
    
    const collapseBtn = document.querySelector('[id=collapseBtn]');

    if(!collapseBtn){
        // Añadir el botón al lado del texto del título para un layout correcto
        if (firstHeaderText.parentElement) {
            firstHeaderText.parentElement.style.display = 'flex';
            firstHeaderText.parentElement.style.alignItems = 'center';
            firstHeaderText.parentElement.appendChild(btn);
        }
    }
    const columnTitle = firstHeaderText.firstChild.textContent || 'Columna';

    // 6. Añadir el Listener de Clic
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
       hideShow();
       
    });
    
    hideShowColumns(columns, columnTitle);
    // Actualizar el layout de todos los grids padres afectados
    const allGridParents = new Set(columns.map(c => c.parentElement));
    allGridParents.forEach(updateGridLayout);
  
    console.log("Jira Collapser: Botón añadido a la primera columna.");
}

function hideShow(){
    hideMode = !hideMode;
}

function hideShowColumns(columns, columnTitle){
        
    const verticalTitle = document.createElement('div');
    verticalTitle.className = 'vertical-column-title';
    verticalTitle.textContent = columnTitle;
    verticalTitle.title = columnTitle;

    columns.forEach(function(column){
        if(column.children.length!=2){
            column.appendChild(verticalTitle);
        }
        column.dataset.collapseInitialized = 'true';

        // const isNowCollapsed = !column.classList.contains('is-collapsed');
        column.classList.toggle('is-collapsed', hideMode);
        
        if(!hideMode){
            column.firstChild.firstChild.classList.add("hide");
        }else{
            column.firstChild.firstChild.classList.remove("hide");
        }   
    }); 

    
    
    const allGridParents = new Set(columns.map(c => c.parentElement));
    allGridParents.forEach(updateGridLayout);
}

// --- SECCIÓN 3: INICIALIZACIÓN Y OBSERVER ---
const debouncedInit = debounce(() => {
    processCards();
    initCollapsibleFirstColumn();
}, 750); 

const observer = new MutationObserver(() => {
    debouncedInit();
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const boardAreaSelector = 'div[data-testid="software-board.board-area"]';
const boardAreaContainer = document.querySelector(boardAreaSelector);
if (boardAreaContainer) {
    observer.observe(boardAreaContainer, { childList: true, subtree: true });
} else {
    observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('load', () => {
    setTimeout(() => {
        processCards();
        initCollapsibleFirstColumn();
    }, 3000); 
});

console.log('Jira Enhancer loaded. Final version with corrected functions.');