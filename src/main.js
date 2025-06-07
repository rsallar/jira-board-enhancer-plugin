import { processCards, initCustomStatusSelector } from './modules/subtasks.js';
import { initCollapsibleFirstColumn } from './modules/collapser.js';
import { initCustomTooltip } from './modules/tooltip.js';

// --- ¡NUEVO PATRÓN SINGLETON CENTRALIZADO! ---
// Comprobamos si nuestro objeto de estado global ya existe.
// Si no, lo creamos con TODOS los estados necesarios para la extensión.
if (!window.JiraEnhancerState) {
  window.JiraEnhancerState = {
    // Estado para el selector de estado
    statusSelector: {
      customPopup: null,
      activeTrigger: null,
    },
    // Estado para el colapsador de columnas
    collapser: {
      hideMode: false,
      masterColumnTitle: null,
      // Los selectores son constantes, pero los ponemos aquí para evitar redeclararlos
      headerSelector: '[data-testid="platform-board-kit.common.ui.column-header.header.column-header-container"]',
      headerTextSelector: '[data-testid="platform-board-kit.common.ui.column-header.editable-title.column-title.column-title"]',
      columnWrapperSelector: '[data-testid="platform-board-kit.ui.column.draggable-column.styled-wrapper"]',
      swimlaneColumnsContainerSelector: '[data-testid="platform-board-kit.ui.swimlane.swimlane-columns"]',
    }
  };
}

function main() {

  initCustomStatusSelector(); 

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
  const debouncedInit = debounce(() => {
    processCards();
    initCollapsibleFirstColumn();
    initCustomTooltip();
  }, 200);
  const observer = new MutationObserver(() => { debouncedInit(); });
  function startObserver() {
    const boardAreaSelector = 'div[data-testid="software-board.board-area"]';
    const boardAreaContainer = document.querySelector(boardAreaSelector);
    if (boardAreaContainer) {
      observer.observe(boardAreaContainer, { childList: true, subtree: true });
      debouncedInit();
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  startObserver();
}

if (!window.jiraEnhancerLoaded) {
  window.jiraEnhancerLoaded = true;
  main();
} else {
  //"Jira Enhancer ya está cargado. Omitiendo reinicialización."
}