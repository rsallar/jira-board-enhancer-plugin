// --- CONFIGURACIÓN ---
const JIRA_URL_BASE = "https://paradigma.atlassian.net"; 

// ... (tu función fetchIssueDetails sin cambios) ...
async function fetchIssueDetails(issueKey) {
  // ...
}

// --- GESTOR DE MENSAJES ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUBTASK_DETAILS") {
    fetchIssueDetails(request.issueKey)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Respuesta asíncrona
  }
});

// --- LÓGICA DE INYECCIÓN DE SCRIPTS ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Nos aseguramos de inyectar solo una vez cuando la pestaña está completamente cargada
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }
  
  const isJiraBoard = tab.url.startsWith(JIRA_URL_BASE) && 
                      (tab.url.includes('/boards/') || tab.url.includes('/RapidBoard.jspa'));

  if (isJiraBoard) {
    try {
      // Inyectamos el CSS. Vite lo habrá compilado en un solo fichero 'styles.css'
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["styles.css"]
      });
      
      // Inyectamos el JS. Vite lo habrá compilado en 'main.js'
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["main.js"]
      });
      console.log("Jira Enhancer inyectado en la pestaña:", tabId);
      
    } catch (err) {
      console.error("Error al inyectar los scripts:", err);
    }
  }
});

console.log("Jira Enhancer Service Worker cargado.");