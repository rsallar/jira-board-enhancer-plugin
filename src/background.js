// --- CONFIGURACIÓN ---
const JIRA_URL_BASE = "https://paradigma.atlassian.net";

// --- FUNCIÓN PARA LLAMAR A LA API DE JIRA ---
async function fetchIssueDetails(issueKey) {
  // ... (tu código de fetchIssueDetails, sin cambios, está perfecto)
  if (!JIRA_URL_BASE) {
    console.error('Jira Enhancer: Configuración de JIRA_URL_BASE no encontrada en background.js.');
    return { success: false, error: 'Configuración JIRA_URL_BASE incompleta en background.js.' };
  }
  const apiUrl = `${JIRA_URL_BASE}/rest/api/2/issue/${issueKey}?fields=summary,status,assignee,issuetype`;
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
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
        title: data.fields.summary,
        status: data.fields.status.name,
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

// --- GESTOR DE MENSAJES ENTRE SCRIPTS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUBTASK_DETAILS") {
    fetchIssueDetails(request.issueKey)
      .then(response => sendResponse(response));
    return true; // Respuesta asíncrona
  }
});


// --- FUNCIÓN DE INYECCIÓN INTELIGENTE ---
async function injectContentScripts(tab) {
  try {
    // 1. COMPROBACIÓN PREVIA: Ejecutamos una función diminuta en la página
    //    para ver si nuestro guardián 'window.jiraEnhancerLoaded' ya existe.
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.jiraEnhancerLoaded,
    });

    // Si 'result' es true, significa que el script ya está ahí. No hacemos nada más.
    if (result) {
      console.log("Jira Enhancer ya está inyectado. Omitiendo.");
      return;
    }

  } catch (e) {
    // Este error puede ocurrir si intentamos acceder a una página protegida
    // (como la Chrome Web Store) o si la pestaña se está cerrando. Lo ignoramos.
    console.warn(`No se pudo comprobar el estado del script en la pestaña ${tab.id}:`, e.message);
  }

  // 2. INYECCIÓN: Si la comprobación previa no devolvió 'true', procedemos a inyectar.
  try {
    console.log("Inyectando Jira Enhancer por primera vez en la pestaña:", tab.id);

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

// --- LISTENER DE PESTAÑAS (Ahora más simple) ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  const urlMatchesBase = tab.url.startsWith(JIRA_URL_BASE);
  const isBoardPage = tab.url.includes('/boards/') || tab.url.includes('/RapidBoard.jspa');

  if (urlMatchesBase && isBoardPage) {
    // Llamamos a nuestra nueva función inteligente.
    injectContentScripts(tab);
  }
});

console.log("Jira Enhancer Service Worker cargado.");