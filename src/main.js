// Las importaciones siempre en el nivel superior del módulo.
import { processCards } from './modules/subtasks.js';
import { initCollapsibleFirstColumn } from './modules/collapser.js';
import { initCustomTooltip } from './modules/tooltip.js';
import { initCustomStatusSelector } from './modules/subtasks.js'; // <-- IMPORTAMOS LA NUEVA FUNCIÓN


// Función principal que contiene toda la lógica.
function main() {
  console.log("Jira Enhancer Inicializado por primera vez!");
  initCustomStatusSelector(); 
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
      debouncedInit(); // Llamada inicial
      console.log("Observer iniciado en el board area.");
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log("Observer iniciado en el body (fallback).");
    }
  }

  startObserver();
}


// ==========================================================
// EL GUARDIÁN Y PUNTO DE ENTRADA
// ==========================================================
if (!window.jiraEnhancerLoaded) {
  window.jiraEnhancerLoaded = true;
  main(); // <-- Llamamos a nuestra función principal solo si no se ha cargado antes.
} else {
  console.log("Jira Enhancer ya está cargado. Omitiendo reinicialización.");
}