const urlInput = document.getElementById('jira-url-input');
const addBtn = document.getElementById('add-btn');
const statusDiv = document.getElementById('status');
const instancesList = document.getElementById('jira-instances-list');

// Function to render the list of saved URLs
function renderInstances(urls) {
    instancesList.innerHTML = '';
    urls.forEach(url => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = url;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Remove';
        deleteBtn.className = 'delete-btn';
        deleteBtn.dataset.url = url;

        deleteBtn.addEventListener('click', async () => {
            const urlToRemove = deleteBtn.dataset.url;
            const result = await chrome.storage.sync.get({ jiraInstances: [] });
            const updatedUrls = result.jiraInstances.filter(u => u !== urlToRemove);
            
            await chrome.storage.sync.set({ jiraInstances: updatedUrls });
            
            // We also need to revoke the permission
            await chrome.permissions.remove({ origins: [`${urlToRemove}/*`] });
            
            renderInstances(updatedUrls);
            statusDiv.textContent = `Removed ${urlToRemove}`;
        });

        li.appendChild(span);
        li.appendChild(deleteBtn);
        instancesList.appendChild(li);
    });
}

// Function to add a new instance
async function addInstance() {
    let newUrl = urlInput.value.trim();
    if (!newUrl) return;

    // Basic validation and cleanup
    try {
        const urlObject = new URL(newUrl);
        newUrl = urlObject.origin; // Ensures we only store the base (e.g., https://name.atlassian.net)
    } catch (e) {
        statusDiv.textContent = 'Invalid URL format.';
        statusDiv.style.color = 'red';
        return;
    }

    const { jiraInstances: currentUrls = [] } = await chrome.storage.sync.get({ jiraInstances: [] });

    if (currentUrls.includes(newUrl)) {
        statusDiv.textContent = 'This URL is already configured.';
        statusDiv.style.color = 'orange';
        return;
    }

    // Request permission from the user for the new host
    const granted = await chrome.permissions.request({ origins: [`${newUrl}/*`] });

    if (granted) {
        const updatedUrls = [...currentUrls, newUrl];
        await chrome.storage.sync.set({ jiraInstances: updatedUrls });
        renderInstances(updatedUrls);
        statusDiv.textContent = `Successfully added and enabled ${newUrl}!`;
        statusDiv.style.color = 'green';
        urlInput.value = '';
    } else {
        statusDiv.textContent = 'Permission was not granted for that URL.';
        statusDiv.style.color = 'red';
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    const { jiraInstances = [] } = await chrome.storage.sync.get({ jiraInstances: [] });
    renderInstances(jiraInstances);
});

addBtn.addEventListener('click', addInstance);