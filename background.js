// --- CONFIGURACIÓN HARCODEADA ---
// !!! REEMPLAZA ESTE VALOR CON EL TUYO !!!
const JIRA_URL_BASE = "https://paradigma.atlassian.net"; // Ejemplo: "https://ejemplo.atlassian.net"
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
        issueTypeIconUrl: data.fields.issuetype.iconUrl
      }
    };
  } catch (error) {
    console.error(`Jira Enhancer: Network error fetching ${issueKey}:`, error);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUBTASK_DETAILS") {
    fetchIssueDetails(request.issueKey)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indica que la respuesta será asíncrona
  }
});

console.log("Jira Enhancer background script (active session) loaded.");