import '../styles/collapser.css'; // ¡Importamos su CSS directamente!

/**
 * Aplica el estado actual (colapsado o expandido) a la interfaz de usuario.
 * Esta función es la ÚNICA responsable de modificar el DOM según el valor de `hideMode`.
 */ 
function applyCollapseState() {
    // Obtenemos las variables de nuestro estado global
    const state = window.JiraEnhancerState.collapser;

    if (!state.masterColumnTitle) {
        const titleElement = document.querySelector('[data-testid="platform-board-kit.common.ui.column-header.editable-title.column-title.column-name"]');
        state.masterColumnTitle = titleElement ? titleElement.textContent.trim() : 'Columna';
    }
    
    const firstColumns = Array.from(document.querySelectorAll(state.swimlaneColumnsContainerSelector))
        .map(container => container.querySelector(state.columnWrapperSelector))
        .filter(Boolean);

    if (firstColumns.length === 0) return;

    firstColumns.forEach(column => {
        let verticalTitleElement = column.querySelector('.vertical-column-title');
        if (!verticalTitleElement) {
            verticalTitleElement = document.createElement('div');
            verticalTitleElement.className = 'vertical-column-title';
            column.appendChild(verticalTitleElement);
        }
        if (!verticalTitleElement.textContent && state.masterColumnTitle) {
            verticalTitleElement.textContent = state.masterColumnTitle;
            verticalTitleElement.title = state.masterColumnTitle;
        }
        column.classList.toggle('is-collapsed', state.hideMode);
        const contentContainer = column.firstChild?.firstChild;
        if (contentContainer) {
            contentContainer.classList.toggle('hide', state.hideMode);
        }
        if (!column.dataset.clickListenerAdded) {
            column.addEventListener('click', () => {
                if (state.hideMode) {
                    state.hideMode = false;
                    applyCollapseState();
                }
            });
            column.dataset.clickListenerAdded = 'true';
        }
    });

    const headerGridParent = document.querySelector(state.headerSelector)?.parentElement?.parentElement?.parentElement?.parentElement;
    if (!headerGridParent) return;

    const columnCount = headerGridParent.children.length;
    let gridTemplateStyle;

    if (state.hideMode) {
        gridTemplateStyle = "40px " + "minmax(250px, 1fr) ".repeat(columnCount - 1);
    } else {
        gridTemplateStyle = "minmax(250px, 1fr)".repeat(columnCount);
    }

    headerGridParent.style.gridTemplateColumns = gridTemplateStyle;

    const allSwimlaneGrids = new Set(firstColumns.map(c => c.parentElement).filter(Boolean));
    allSwimlaneGrids.forEach(gridParent => {
        gridParent.style.gridTemplateColumns = gridTemplateStyle;
    });

    const collapseBtn = document.querySelector('#collapseBtn');
    if (collapseBtn) {
        collapseBtn.classList.toggle("btnCollapsed", state.hideMode);
        collapseBtn.parentElement.firstChild.classList.toggle("hide", state.hideMode);
    }
}


/**
 * Función principal que inicializa la funcionalidad de colapso.
 * Se ejecuta para crear el botón y establecer el estado inicial.
 */
export function initCollapsibleFirstColumn() {
    // Obtenemos las variables de nuestro estado global
    const state = window.JiraEnhancerState.collapser;

    if (document.querySelector('#collapseBtn')) {
        applyCollapseState();
        return;
    }

    const mainHeaderTextContainer = document.querySelector(state.headerTextSelector)?.parentElement;
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
        state.hideMode = !state.hideMode; // Actualizamos el estado
        applyCollapseState();
    });

    applyCollapseState();
}