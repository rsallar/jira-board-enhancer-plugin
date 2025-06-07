// --- CONFIGURACIÓN ---
const JIRA_URL_BASE = "https://paradigma.atlassian.net";

// --- FUNCIÓN: OBTENER DETALLES DE UNA TAREA ---
async function fetchIssueDetails(issueKey) {
  const apiUrl = `${JIRA_URL_BASE}/rest/api/2/issue/${issueKey}?fields=summary,status,assignee,issuetype`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira Enhancer: Error fetching ${issueKey}: ${response.status} - ${response.statusText}`, errorText);
      return { success: false, error: `API Error ${response.status} (${response.statusText})`, data: errorText };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: {
        key: data.key, // CLAVE: Añadimos la key de la issue, la necesitaremos
        title: data.fields.summary,
        status: data.fields.status.name,
        statusCategoryKey: data.fields.status.statusCategory.key,
        avatarUrl: data.fields.assignee ? data.fields.assignee.avatarUrls['24x24'] : null,
        assigneeName: data.fields.assignee ? data.fields.assignee.displayName : 'Sin asignar',
        issueType: data.fields.issuetype.name,
        issueTypeIconUrl: data.fields.issuetype.iconUrl,
        url: `${JIRA_URL_BASE}/browse/${issueKey}`
      }
    };
  } catch (error) {
    console.error(`Jira Enhancer: Network error fetching ${issueKey}:`, error);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

// --- NUEVA FUNCIÓN: OBTENER TRANSICIONES DISPONIBLES ---
async function fetchTransitions(issueKey) {
  const apiUrl = `${JIRA_URL_BASE}/rest/api/2/issue/${issueKey}/transitions`;
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    return { success: true, data: data.transitions }; // Devuelve el array de transiciones
  } catch (error) {
    console.error(`Error fetching transitions for ${issueKey}:`, error);
    return { success: false, error: error.message };
  }
}

// --- NUEVA FUNCIÓN: EJECUTAR UNA TRANSICIÓN (CAMBIAR ESTADO) ---
async function postTransition(issueKey, transitionId) {
  const apiUrl = `${JIRA_URL_BASE}/rest/api/2/issue/${issueKey}/transitions`;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        transition: {
          id: transitionId
        }
      })
    });
    // Una respuesta 204 (No Content) es un éxito para esta operación
    if (!response.ok) throw new Error(`API Error ${response.status} (${response.statusText})`);
    return { success: true };
  } catch (error) {
    console.error(`Error posting transition for ${issueKey}:`, error);
    return { success: false, error: error.message };
  }
}

// --- GESTOR DE MENSAJES (ACTUALIZADO) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUBTASK_DETAILS") {
    fetchIssueDetails(request.issueKey).then(sendResponse);
    return true;
  }
  if (request.type === "GET_TRANSITIONS") {
    fetchTransitions(request.issueKey).then(sendResponse);
    return true; // Respuesta asíncrona
  }
  if (request.type === "SET_TRANSITION") {
    postTransition(request.issueKey, request.transitionId).then(sendResponse);
    return true; // Respuesta asíncrona
  }
  if (request.type === "GET_MULTIPLE_SUBTASK_DETAILS") {
    const promises = request.issueKeys.map(key => fetchIssueDetails(key));
    Promise.all(promises).then(results => {
        // Creamos un mapa para que el frontend pueda buscar los detalles fácilmente
        const detailsMap = {};
        results.forEach(res => {
            if (res.success) {
                detailsMap[res.data.key] = res.data;
            }
        });
        sendResponse({ success: true, data: detailsMap });
    });
    return true; // Respuesta asíncrona
  }
});


// --- LÓGICA DE INYECCIÓN INTELIGENTE ---
async function injectContentScripts(tab) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.jiraEnhancerLoaded,
    });
    if (result) {
      return;
    }
  } catch (e) {
    console.warn(`No se pudo comprobar el estado del script en la pestaña ${tab.id}:`, e.message);
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["styles.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["main.js"],
    });
  } catch (err) {
    console.error("Error durante la inyección del script:", err);
  }
}

// --- LISTENER DE PESTAÑAS ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }
  const urlMatchesBase = tab.url.startsWith(JIRA_URL_BASE);
  const isBoardPage = tab.url.includes('/boards/') || tab.url.includes('/RapidBoard.jspa');
  if (urlMatchesBase && isBoardPage) {
    injectContentScripts(tab);
  }
});