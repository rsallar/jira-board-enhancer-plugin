import '../styles/collapser.css'; // ¡Importamos su CSS directamente!
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
export function initCollapsibleFirstColumn() {

    
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
