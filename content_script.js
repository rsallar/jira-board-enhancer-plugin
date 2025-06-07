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

/**
 * Variables globales y selectores
 */
const headerSelector = '[data-testid="platform-board-kit.common.ui.column-header.header.column-header-container"]';
const headerTextSelector = '[data-testid="platform-board-kit.common.ui.column-header.editable-title.column-title.column-title"]';
const columnWrapperSelector = '[data-testid="platform-board-kit.ui.column.draggable-column.styled-wrapper"]';
const swimlaneColumnsContainerSelector = '[data-testid="platform-board-kit.ui.swimlane.swimlane-columns"]';

// La variable de estado que controla si la columna está colapsada.
let hideMode = false;
let masterColumnTitle = null;

/**
 * Aplica el estado actual (colapsado o expandido) a la interfaz de usuario.
 * Esta función es la ÚNICA responsable de modificar el DOM según el valor de `hideMode`.
 */
function applyCollapseState() {
    // --- PASO 1 y 2 (Obtener título y columnas) - Sin cambios ---
    if (!masterColumnTitle) {
        const titleElement = document.querySelector('[data-testid="platform-board-kit.common.ui.column-header.editable-title.column-title.column-name"]');
        masterColumnTitle = titleElement ? titleElement.textContent.trim() : 'Columna';
        console.log("Título maestro final detectado y cacheado:", masterColumnTitle);
    }
    
    const firstColumns = Array.from(document.querySelectorAll(swimlaneColumnsContainerSelector))
        .map(container => container.querySelector(columnWrapperSelector))
        .filter(Boolean);

    if (firstColumns.length === 0) return;

    // --- PASO 3 (Recorrer y aplicar lógica a columnas) - Sin cambios ---
    firstColumns.forEach(column => {
        // ... (toda la lógica para el título vertical, clases y listeners de clic se queda igual)
        let verticalTitleElement = column.querySelector('.vertical-column-title');
        if (!verticalTitleElement) {
            verticalTitleElement = document.createElement('div');
            verticalTitleElement.className = 'vertical-column-title';
            column.appendChild(verticalTitleElement);
        }
        if (!verticalTitleElement.textContent && masterColumnTitle) {
            verticalTitleElement.textContent = masterColumnTitle;
            verticalTitleElement.title = masterColumnTitle;
        }
        column.classList.toggle('is-collapsed', hideMode);
        const contentContainer = column.firstChild?.firstChild;
        if (contentContainer) {
            contentContainer.classList.toggle('hide', hideMode);
        }
        if (!column.dataset.clickListenerAdded) {
            column.addEventListener('click', () => {
                if (hideMode) {
                    hideMode = false;
                    applyCollapseState();
                }
            });
            column.dataset.clickListenerAdded = 'true';
        }
    });

    // --- PASO 4: LÓGICA DE GRID REFACTORIZADA Y UNIFICADA ---
    
    // Obtenemos el contenedor de las cabeceras
    const headerGridParent = document.querySelector(headerSelector)?.parentElement?.parentElement?.parentElement?.parentElement;
    if (!headerGridParent) return;

    // Calculamos el número de columnas a partir del grid de las cabeceras (la fuente de verdad)
    const columnCount = headerGridParent.children.length;
    let gridTemplateStyle;

    // Definimos el estilo del grid UNA SOLA VEZ
    if (hideMode) {
        gridTemplateStyle = "40px " + "minmax(250px, 1fr) ".repeat(columnCount - 1);
    } else {
        gridTemplateStyle = "minmax(250px, 1fr)".repeat(columnCount);
    }

    // Aplicamos ESE MISMO ESTILO a las cabeceras
    headerGridParent.style.gridTemplateColumns = gridTemplateStyle;

    // Y lo aplicamos A TODOS los contenedores de swimlanes
    const allSwimlaneGrids = new Set(firstColumns.map(c => c.parentElement).filter(Boolean));
    allSwimlaneGrids.forEach(gridParent => {
        gridParent.style.gridTemplateColumns = gridTemplateStyle;
    });

    // --- PASO 5: ACTUALIZAR EL BOTÓN (Lógica simplificada) ---
    const collapseBtn = document.querySelector('#collapseBtn');
    if (collapseBtn) {
        collapseBtn.classList.toggle("btnCollapsed", hideMode);
        collapseBtn.parentElement.firstChild.classList.toggle("hide", hideMode);
    }
}


/**
 * Función principal que inicializa la funcionalidad de colapso.
 * Se ejecuta para crear el botón y establecer el estado inicial.
 */
function initCollapsibleFirstColumn() {
    // Si el botón ya existe, no hacemos nada más que asegurarnos de que el estado es correcto.
    if (document.querySelector('#collapseBtn')) {
        applyCollapseState();
        return;
    }

    // Buscamos la cabecera principal SOLO para añadir el botón.
    const mainHeaderTextContainer = document.querySelector(headerTextSelector)?.parentElement;
    if (!mainHeaderTextContainer) return;

    const btn = document.createElement('button');
    btn.id = 'collapseBtn';
    btn.className = 'horizontal-collapse-btn';
    btn.title = 'Colapsar/Expandir';
    btn.innerHTML = `<svg class="icon-collapse" viewBox="0 0 24 24"><path d="M14 17.364l-6.73-5.364 6.73-5.364v10.728z" fill="currentColor"/></svg><svg class="icon-expand" viewBox="0 0 24 24"><path d="M10 17.364v-10.728l6.73 5.364-6.73 5.364z" fill="currentColor"/></svg>`;
    
    mainHeaderTextContainer.style.display = 'flex';
    mainHeaderTextContainer.style.alignItems = 'center';
    mainHeaderTextContainer.appendChild(btn);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        hideMode = !hideMode;
        applyCollapseState();
    });

    applyCollapseState(); // Aplicamos el estado inicial.
    console.log("Jira Collapser: Botón de colapso inicializado.");
}

// ==========================================================
// SECCIÓN 4: TOOLTIP PERSONALIZADO PARA SUBTAREAS
// ==========================================================

// ==========================================================
// SECCIÓN 4: TOOLTIP PERSONALIZADO (VERSIÓN ANTI-JIRA)
// ==========================================================

function initCustomTooltip() {
    if (document.getElementById('custom-subtask-tooltip')) {
        return;
    }

    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'custom-subtask-tooltip';
    document.body.appendChild(tooltipElement);

    // Usamos event delegation para manejar los hovers.
    document.body.addEventListener('mouseover', (e) => {
        // Solo nos interesan nuestros enlaces de subtarea
        if (e.target.matches('.subtask-title-link')) {
            const link = e.target;
            
            // --- ¡EL CAMBIO CLAVE ESTÁ AQUÍ! ---
            // Detenemos el evento INMEDIATAMENTE para que los scripts de Jira no lo reciban.
            e.stopPropagation();

            // Lógica para mostrar nuestro tooltip solo si es necesario
            if (link.scrollWidth > link.clientWidth) {
                const tooltip = document.getElementById('custom-subtask-tooltip');
                tooltip.textContent = link.dataset.fullTitle;
                tooltip.style.display = 'block';
            }
        }
    }, true); // <-- ¡IMPORTANTE! Usar 'true' para la fase de captura.

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.matches('.subtask-title-link')) {
            e.stopPropagation(); // Buena práctica detener también este evento
            const tooltip = document.getElementById('custom-subtask-tooltip');
            tooltip.style.display = 'none';
        }
    }, true); // <-- También en fase de captura.
    
    document.body.addEventListener('mousemove', (e) => {
        const tooltip = document.getElementById('custom-subtask-tooltip');
        if (tooltip.style.display === 'block') {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
        }
    });
}


// --- SECCIÓN DE INICIALIZACIÓN Y OBSERVER (Sin cambios, ya estaba bien) ---
const debouncedInit = debounce(() => {
    processCards(); // Descomenta si usas esta función
    initCollapsibleFirstColumn();
    initCustomTooltip();
}, 100);

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
         initCustomTooltip();
    }, 2000);
});
