import '../styles/subtasks.css';


// Ahora, en lugar de usar variables globales, usaremos las propiedades
// de nuestro objeto singleton: window.JiraEnhancerState.customPopup, etc.

export function initCustomStatusSelector() {
  if (document.getElementById('custom-status-popup')) return;
  
  const state = window.JiraEnhancerState.statusSelector;
  state.customPopup = document.createElement('div');
  state.customPopup.id = 'custom-status-popup';
  document.body.appendChild(state.customPopup);
  
  // --- ¡NUEVO LISTENER DE MOUSE DOWN! ---
  // Este es nuestro "escudo". Se ejecuta en la fase de captura (true)
  // para ser el primero en actuar.
  document.body.addEventListener('mousedown', (e) => {
    // Si el mousedown ocurre sobre nuestro botón de estado...
    const statusTrigger = e.target.closest('.status-selector-trigger');
    if (statusTrigger) {
      // ...detenemos el evento inmediatamente. Esto previene que el listener
      // de Jira en la tarjeta padre se active y comience la navegación.
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // <-- El 'true' es vital para usar la fase de captura.


  // --- NUESTRO LISTENER DE CLICK (AHORA SEGURO) ---
  // Este listener ahora se ejecutará sin que Jira interfiera,
  // porque el mousedown ya ha sido neutralizado.
  document.body.addEventListener('click', (e) => {
    // Comprobamos si el clic fue en nuestro botón de estado
    const statusTrigger = e.target.closest('.status-selector-trigger');
    if (statusTrigger) {
      // Como ya hemos prevenido la acción por defecto en el mousedown,
      // aquí solo nos preocupamos de abrir nuestro selector.
      openCustomStatusSelector(statusTrigger);
      return;
    }

    // El resto de la lógica de delegación para cerrar el popup y
    // manejar otros clics se queda igual.
    const titleLink = e.target.closest('.subtask-title-link');
    if (titleLink) {
        e.stopPropagation();
        return;
    }
    
    const subtaskItem = e.target.closest('.subtask-item');
    if (subtaskItem) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (state.customPopup.classList.contains('is-visible') && !e.target.closest('#custom-status-popup')) {
        state.customPopup.classList.remove('is-visible');
    }
  });

  document.addEventListener('keydown', (e) => {
      const { customPopup } = window.JiraEnhancerState.statusSelector;
      if (e.key === 'Escape' && customPopup.classList.contains('is-visible')) {
        customPopup.classList.remove('is-visible');
      }
   });
}

async function openCustomStatusSelector(triggerButton) {
  // Obtenemos las referencias de nuestro objeto de estado global
 const { customPopup, activeTrigger } = window.JiraEnhancerState.statusSelector;

  // Los datos de la subtarea los obtenemos del dataset del botón
  const issueKey = triggerButton.dataset.issueKey;
  const currentStatus = triggerButton.dataset.originalStatus;

  // Si el popup ya está visible y fue abierto por este mismo botón, lo cerramos y salimos.
  if (customPopup.classList.contains('is-visible') && activeTrigger === triggerButton) {
    customPopup.classList.remove('is-visible');
    return;
  }
  
  // Actualizamos el trigger activo en nuestro objeto de estado
  window.JiraEnhancerState.statusSelector.activeTrigger = triggerButton;
  
  // Mostramos el estado de carga y limpiamos el contenido anterior del popup
  triggerButton.classList.add('is-loading');
  customPopup.innerHTML = '';

  // Pedimos las transiciones disponibles al backend
  const response = await new Promise(resolve => 
    chrome.runtime.sendMessage({ type: "GET_TRANSITIONS", issueKey }, resolve)
  );

  triggerButton.classList.remove('is-loading');

  if (!response || !response.success) {
    console.error(`Error al obtener estados para ${issueKey}.`);
    return;
  }

  // Creamos la lista de opciones para el popup
  const optionsList = document.createElement('ul');
  response.data.forEach(transition => {
    const listItem = document.createElement('li');
    const optionButton = document.createElement('button');
    optionButton.textContent = transition.name;
    optionButton.dataset.transitionId = transition.id;
    optionButton.dataset.newStatusName = transition.to.name;
    optionButton.dataset.newCategoryKey = transition.to.statusCategory.key;

    // Marcamos la opción que corresponde al estado actual
    if (transition.name === currentStatus) {
      optionButton.classList.add('is-current-status');
      optionButton.disabled = true;
    }

    // Añadimos el listener para ejecutar el cambio de estado al hacer clic
    optionButton.addEventListener('click', async () => {
      triggerButton.classList.add('is-loading');
      customPopup.classList.remove('is-visible');

      const setResponse = await new Promise(resolve => 
        chrome.runtime.sendMessage({ type: "SET_TRANSITION", issueKey, transitionId: optionButton.dataset.transitionId }, resolve)
      );

      triggerButton.classList.remove('is-loading');

      if (setResponse && setResponse.success) {
        // Actualizamos el botón de la UI con el nuevo estado y color
        const newStatusName = optionButton.dataset.newStatusName;
        const newCategoryKey = optionButton.dataset.newCategoryKey;
        
        triggerButton.querySelector('span').textContent = getShortStatus(newStatusName);
        triggerButton.dataset.originalStatus = newStatusName;
        triggerButton.title = `Estado: ${newStatusName} (clic para cambiar)`;
        
        triggerButton.classList.remove('status-color-grey', 'status-color-blue', 'status-color-green');
        triggerButton.classList.add(getStatusCategoryClass(newCategoryKey));
      } else {
        console.error(`Error al cambiar el estado de ${issueKey}.`);
      }
    });

    listItem.appendChild(optionButton);
    optionsList.appendChild(listItem);
  });
  
  customPopup.appendChild(optionsList);
  
  // Posicionamos el popup justo debajo del botón que lo abrió
  const rect = triggerButton.getBoundingClientRect();
  customPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
  customPopup.style.left = `${rect.left + window.scrollX}px`;
  
  // Hacemos visible el popup
  customPopup.classList.add('is-visible');
}


function getShortStatus(statusName) {
  if (!statusName) return '';

  const upperStatus = statusName.toUpperCase();

  if (upperStatus.length > 8) {
    // Si es más largo, corta a 8 caracteres y añade "..."
    return upperStatus.substring(0, 8) + '...';
  } else {
    // Si tiene 8 o menos, lo devuelve tal cual
    return upperStatus;
  }
}

// NUEVA FUNCIÓN para obtener la clase CSS según la categoría
function getStatusCategoryClass(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'status-color-green';
    case 'indeterminate': // 'In Progress', 'In Review', etc.
      return 'status-color-blue';
    case 'new': // 'To Do', 'Open', 'Backlog', etc.
    default:
      return 'status-color-grey';
  }
}

function createStatusSpan(issueKey, statusName, statusCategoryKey) {
  const statusButton = document.createElement('button');
  
  // Añadimos la clase base y la clase de color
  statusButton.className = `status-selector-trigger ${getStatusCategoryClass(statusCategoryKey)}`;
  
  // Guardamos todos los datos necesarios en el dataset del botón
  statusButton.dataset.issueKey = issueKey;
  statusButton.dataset.originalStatus = statusName;
  statusButton.title = `Estado: ${statusName} (clic para cambiar)`;
  
  // Creamos el span interior para el texto
  const textSpan = document.createElement('span');
  textSpan.textContent = getShortStatus(statusName);
  statusButton.appendChild(textSpan);
  
  // ¡IMPORTANTE! Ya no añadimos el listener aquí. La delegación se encarga.
  
  return statusButton;
}

// --- FUNCIÓN DE RENDERIZADO PRINCIPAL (ACTUALIZADA) ---
function createSubtaskListDOM(subtasksData) {
    if (!subtasksData || !subtasksData.length === 0) return null;

    // 1. Creamos el DocumentFragment. Es un contenedor ligero en memoria.
    const fragment = document.createDocumentFragment();
    
    const ul = document.createElement('ul');
    ul.className = 'subtask-list';

    subtasksData.forEach(subtask => {
        const li = document.createElement('li');
        li.className = 'subtask-item';
        // El listener de clic se maneja por delegación, así que no se añade aquí.

        const mainContentSpan = document.createElement('span');
        mainContentSpan.className = 'subtask-item-main';

        const typeIcon = document.createElement('img');
        typeIcon.src = subtask.issueTypeIconUrl;
        typeIcon.alt = subtask.issueType;
        typeIcon.className = 'subtask-issuetype-icon';
        mainContentSpan.appendChild(typeIcon);

        const titleLink = document.createElement('a');
        titleLink.className = 'subtask-title-link';
        if (subtask.statusCategoryKey === 'done') {
            titleLink.classList.add('is-done');
        }
        titleLink.textContent = subtask.title;
        titleLink.dataset.fullTitle = subtask.title;
        titleLink.href = subtask.url;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
        mainContentSpan.appendChild(titleLink);
        
        li.appendChild(mainContentSpan);

        const detailsSpan = document.createElement('span');
        detailsSpan.className = 'subtask-item-details';

        const statusButton = createStatusSpan(subtask.key, subtask.status, subtask.statusCategoryKey);
        detailsSpan.appendChild(statusButton);

        if (subtask.avatarUrl) {
            const avatarImg = document.createElement('img');
            avatarImg.src = subtask.avatarUrl;
            avatarImg.alt = subtask.assigneeName;
            avatarImg.className = 'subtask-avatar';
            detailsSpan.appendChild(avatarImg);
        } else {
            const defaultAvatarContainer = document.createElement('span');
            defaultAvatarContainer.className = 'subtask-avatar default-assignee-icon';
            defaultAvatarContainer.title = 'Sin asignar';
            defaultAvatarContainer.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
                  <g fill="currentColor" fill-rule="evenodd">
                    <path d="M4.975 18.75a7.218 7.218 0 017.025-5.465 7.218 7.218 0 017.025 5.465.75.75 0 01-1.45.39A5.718 5.718 0 0012 14.816a5.718 5.718 0 00-5.55 4.324.75.75 0 11-1.45-.39zM12 12a4 4 0 110-8 4 4 0 010 8zm0-1.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>
                  </g>
                </svg>
            `;
            detailsSpan.appendChild(defaultAvatarContainer);
        }
        
        li.appendChild(detailsSpan);
        
        // 2. Añadimos cada fila al <ul> que todavía está en memoria.
        ul.appendChild(li);
    });

    // 3. Una vez terminado el bucle, añadimos la lista completa (ul) al fragmento.
    fragment.appendChild(ul);
    
    // 4. Devolvemos el fragmento. El navegador lo insertará en el DOM de una sola vez.
    return fragment;
}

// --- FUNCIÓN DE PROCESAMIENTO DE TARJETAS (SIN CAMBIOS) ---
export async function processCards(cardElements) {
    const cardsToProcess = Array.from(cardElements || document.querySelectorAll('div[data-testid="platform-board-kit.ui.card.card"]'));
    const unprocessedCards = cardsToProcess.filter(card => card.dataset.subtasksProcessed !== 'true');

    if (unprocessedCards.length === 0) return;

    // --- 1. RECOGER TODAS LAS CLAVES PRIMERO ---
    const allSubtaskKeys = new Set();
    const cardKeyMap = new Map(); // Para saber qué subtareas pertenecen a qué tarjeta

    unprocessedCards.forEach(card => {
        const subtaskContainer = card.querySelector('div[data-testid="platform-card.common.ui.custom-fields.card-custom-field.html-card-custom-field-content.html-field"][data-issuefieldid="subtasks"]');
        if (subtaskContainer) {
            const issueKeys = (subtaskContainer.textContent.match(/[A-ZÁÉÍÓÚÑÜ]+-[0-9]+/gi) || []).map(k => k.toUpperCase());
            if (issueKeys.length > 0) {
                cardKeyMap.set(card, issueKeys);
                issueKeys.forEach(key => allSubtaskKeys.add(key));
            }
        }
        // Marcar la tarjeta como procesada aquí para evitar que se vuelva a escanear,
        // incluso si no tiene subtareas.
        card.dataset.subtasksProcessed = 'true';
    });

    if (allSubtaskKeys.size === 0) {
        return; // No hay subtareas que buscar, salimos.
    }

    // --- 2. HACER UNA ÚNICA PETICIÓN ---
    const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
            type: "GET_MULTIPLE_SUBTASK_DETAILS",
            issueKeys: Array.from(allSubtaskKeys)
        }, resolve);
    });

    if (!response || !response.success) {
        console.error("Error al obtener detalles de múltiples subtareas.");
        return;
    }

    const detailsMap = response.data;

    // --- 3. RENDERIZAR TODO CON LOS DATOS YA OBTENIDOS ---
    cardKeyMap.forEach((subtaskKeys, card) => {
        // 'subtasksData' se define AQUÍ, dentro del bucle, para esta tarjeta específica.
        const subtasksData = subtaskKeys.map(key => detailsMap[key]).filter(Boolean);
        
        // El 'if' que usa 'subtasksData' está justo después, en el ámbito correcto.
        if (subtasksData.length > 0) {
            const subtaskContainer = card.querySelector('div[data-testid="platform-card.common.ui.custom-fields.card-custom-field.html-card-custom-field-content.html-field"][data-issuefieldid="subtasks"]');
            const listElement = createSubtaskListDOM(subtasksData);
            if (listElement && subtaskContainer) {
                subtaskContainer.innerHTML = '';
                subtaskContainer.appendChild(listElement);
            }
        }
    });
}