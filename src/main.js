import './styles/main.css'; // Importa los estilos globales/tooltip
import { processCards } from './modules/subtasks.js';
import { initCollapsibleFirstColumn } from './modules/collapser.js';
import { initCustomTooltip } from './modules/tooltip.js';

console.log("Jira Enhancer (vVite) Loaded!");

// --- FUNCIÓN DEBOUNCE (Utilidad General) ---
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

// --- INICIALIZACIÓN Y OBSERVER ---

const debouncedInit = debounce(() => {
    processCards();
    initCollapsibleFirstColumn();
    initCustomTooltip();
}, 200);

const observer = new MutationObserver(() => {
    debouncedInit();
});

function startObserver() {
    const boardAreaSelector = 'div[data-testid="software-board.board-area"]';
    const boardAreaContainer = document.querySelector(boardAreaSelector);
    
    if (boardAreaContainer) {
        observer.observe(boardAreaContainer, { childList: true, subtree: true });
        // Hacemos una llamada inicial por si el contenido ya está renderizado
        debouncedInit();
        console.log("Observer iniciado en el board area.");
    } else {
        // Fallback si no encontramos el contenedor específico
        observer.observe(document.body, { childList: true, subtree: true });
        console.log("Observer iniciado en el body (fallback).");
    }
}

// La ejecución se inicia inmediatamente en lugar de esperar a window.load,
// el observer se encargará de detectar cuando el contenido esté listo.
startObserver();