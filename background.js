// --- CONFIGURACIÓN HARCODEADA ---
// !!! REEMPLAZA ESTE VALOR CON EL TUYO !!!
const JIRA_URL_BASE = "https://paradigma.atlassian.net"; 
// --- FIN DE LA CONFIGURACIÓN ---

async function fetchIssueDetails(issueKey) {
  if (!JIRA_URL_BASE) {
    console.error('Jira Enhancer: Configuración de JIRA_URL_BASE no encontrada en background.js.');
    return { success: false, error: 'Configuración JIRA_URL_BASE incompleta en background.js.' };
  }

  const apiUrl = `${JIRA_URL_BASE}/rest/api/2/issue/${issueKey}?fields=summary,status,assignee,issuetype`; // o /rest/api/3/

  // Ya no se necesita el header de Authorization con Basic Auth.
  // En su lugar, confiamos en las cookies de la sesión activa de Jira.
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  // headers.append('X-Atlassian-Token', 'no-check'); // A veces necesario para evitar warnings de CSRF en llamadas GET, aunque no siempre. Probar sin esto primero.


  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      credentials: 'include' // ¡¡MUY IMPORTANTE para enviar cookies de sesión!!
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira Enhancer: Error fetching ${issueKey}: ${response.status} - ${response.statusText}`, errorText);
      // Podrías tener un error 401 si la sesión no es válida o no hay permisos.
      // Un error 403 podría ser por CSRF si Jira lo exige incluso para GETs en alguna configuración.
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

function injectModuleLoader() {
  const SCRIPT_ID = 'jira-enhancer-main-script';
  if (document.getElementById(SCRIPT_ID)) {
    return;
  }
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'module';
  script.src = chrome.runtime.getURL('main.js');
  (document.head || document.documentElement).appendChild(script);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUBTASK_DETAILS") {
    fetchIssueDetails(request.issueKey)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indica que la respuesta será asíncrona
  }
});


/**
 * Esta función se ejecuta en el contexto de la página de Jira.
 * Su único trabajo es crear una etiqueta <script> con type="module"
 * para que el navegador cargue nuestro main.js como un módulo.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Asegurarnos de que la pestaña ha terminado de cargar, tiene URL y está activa
  if (changeInfo.status === 'complete' && tab.url && tab.active) {
    
    // --- LÓGICA DE DETECCIÓN MEJORADA ---
    // Verificamos si la URL de la pestaña comienza con la URL base de Jira configurada
    // Y además, si contiene patrones que identifican un tablero.
    const urlMatchesBase = tab.url.startsWith(JIRA_URL_BASE);
    const isBoardPage = tab.url.includes('/boards/') || tab.url.includes('/RapidBoard.jspa');

    
    if (urlMatchesBase && isBoardPage) {
    
      // 1. Inyectamos el CSS
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["styles.css"]
      }).catch(err => console.error("Error al inyectar CSS:", err));

      // 2. Inyectamos el cargador del módulo
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: injectModuleLoader
      }).catch(err => console.error("Error al inyectar el cargador de módulo:", err));
    }
  }
});

console.log("Jira Enhancer loaded.");