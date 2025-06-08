// --- API HELPER FUNCTIONS ---
async function fetchIssueDetails(issueKey, jiraUrl) {
  const apiUrl = `${jiraUrl}/rest/api/2/issue/${issueKey}?fields=summary,status,assignee,issuetype`;
  try {
    const response = await fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, credentials: 'include' });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira Enhancer: Error fetching ${issueKey}: ${response.status} - ${response.statusText}`, errorText);
      return { success: false, error: `API Error ${response.status} (${response.statusText})`, data: errorText };
    }
    const data = await response.json();
    return {
      success: true,
      data: {
        key: data.key, title: data.fields.summary, status: data.fields.status.name,
        statusCategoryKey: data.fields.status.statusCategory.key,
        avatarUrl: data.fields.assignee ? data.fields.assignee.avatarUrls['24x24'] : null,
        assigneeName: data.fields.assignee ? data.fields.assignee.displayName : 'Sin asignar',
        issueType: data.fields.issuetype.name, issueTypeIconUrl: data.fields.issuetype.iconUrl,
        url: `${jiraUrl}/browse/${issueKey}`
      }
    };
  } catch (error) {
    console.error(`Jira Enhancer: Network error fetching ${issueKey}:`, error);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

async function fetchTransitions(issueKey, jiraUrl) {
  const apiUrl = `${jiraUrl}/rest/api/2/issue/${issueKey}/transitions`;
  try {
    const response = await fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, credentials: 'include' });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    return { success: true, data: data.transitions };
  } catch (error) {
    console.error(`Error fetching transitions for ${issueKey}:`, error);
    return { success: false, error: error.message };
  }
}

async function postTransition(issueKey, transitionId, jiraUrl) {
    const apiUrl = `${jiraUrl}/rest/api/2/issue/${issueKey}/transitions`;
    try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ transition: { id: transitionId } })
    });
    if (!response.ok) throw new Error(`API Error ${response.status} (${response.statusText})`);
    return { success: true };
  } catch (error) {
    console.error(`Error posting transition for ${issueKey}:`, error);
    return { success: false, error: error.message };
  }
}

// --- CONTENT SCRIPT INJECTION HELPER ---
async function injectContentScripts(tab) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.jiraEnhancerLoaded });
    if (result) return;
  } catch (e) {
    console.warn(`No se pudo comprobar el estado del script en la pestaña ${tab.id}:`, e.message);
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["styles.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["main.js"] });
  } catch (err) {
    console.error("Error durante la inyección del script:", err);
  }
}

// --- LOGIC HELPER FUNCTION ---
function isPotentialJiraPage(url) {
    if (!url) return false;
    return url.includes('.atlassian.net/') || url.includes('/jira/') || url.includes('/secure/') || url.includes('/RapidBoard.jspa');
}

// --- CHROME API EVENT LISTENERS ---

// LISTENER 1: Fires when a tab is updated (e.g., page loads).
// Its job is to set the badge or inject scripts if permission already exists.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) {
        return;
    }
    const { jiraInstances = [] } = await chrome.storage.sync.get({ jiraInstances: [] });
    const origin = new URL(tab.url).origin;

    if (jiraInstances.includes(origin)) {
        chrome.action.setBadgeText({ tabId: tabId, text: '' });
        const isModernBoardPage = tab.url.includes('/jira/software/') && tab.url.includes('/boards/');
        const isLegacyBoardPage = tab.url.includes('/RapidBoard.jspa');
        if (isModernBoardPage || isLegacyBoardPage) {
            injectContentScripts(tab);
        }
    } else if (isPotentialJiraPage(tab.url)) {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#36b37e' });
        chrome.action.setBadgeText({ tabId: tabId, text: '?' });
        chrome.action.setTitle({ tabId: tabId, title: `Enable Jira Enhancer for ${origin}?` });
    } else {
        chrome.action.setBadgeText({ tabId: tabId, text: '' });
        chrome.action.setTitle({ tabId: tabId, title: 'Improve your jira board' });
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url) {
        // Fallback for edge cases (e.g., on chrome:// pages)
        chrome.runtime.openOptionsPage();
        return;
    }

    const origin = new URL(tab.url).origin;

    // First, do a fast, synchronous check if the URL looks like Jira.
    if (isPotentialJiraPage(tab.url)) {
        
        // Immediately request permission. This is the FIRST async call and is
        // guaranteed to be inside the user gesture window.
        // If permission already exists, it will not show a prompt and will return true.
        const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });

        if (granted) {
            // The user has granted permission (or already had it).
            // NOW it is safe to check storage to see if this is a new addition.
            const { jiraInstances = [] } = await chrome.storage.sync.get({ jiraInstances: [] });

            if (!jiraInstances.includes(origin)) {
                // This is a NEWLY granted permission.
                // Save it to our list and reload the page to activate the extension.
                await chrome.storage.sync.set({ jiraInstances: [...jiraInstances, origin] });
                chrome.tabs.reload(tab.id);
            } else {
                // The permission already existed. The user is just clicking on an
                // already-enabled site, so open the options page as a shortcut.
                chrome.runtime.openOptionsPage();
            }
        }
        // If `granted` is false, it means the user clicked "Deny" in the prompt.
        // We do nothing in that case, respecting their choice.

    } else {
        // If it's not a potential Jira page at all, just open the options page.
        chrome.runtime.openOptionsPage();
    }
});

// LISTENER 3: Fires when a content script sends a message.
// Its job is to handle API requests.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { jiraUrl } = request;
  if (!jiraUrl) {
    console.error("Jira Enhancer: Message received without a jiraUrl.");
    return false;
  }
  if (request.type === "GET_TRANSITIONS") {
    fetchTransitions(request.issueKey, jiraUrl).then(sendResponse);
    return true;
  }
  if (request.type === "SET_TRANSITION") {
    postTransition(request.issueKey, request.transitionId, jiraUrl).then(sendResponse);
    return true;
  }
  if (request.type === "GET_MULTIPLE_SUBTASK_DETAILS") {
    const promises = request.issueKeys.map(key => fetchIssueDetails(key, jiraUrl));
    Promise.all(promises).then(results => {
        const detailsMap = {};
        results.forEach(res => {
            if (res.success) detailsMap[res.data.key] = res.data;
        });
        sendResponse({ success: true, data: detailsMap });
    });
    return true;
  }
});