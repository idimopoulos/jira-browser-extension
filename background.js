importScripts("storage.js");

const ISSUE_KEY_PATTERN = /\/browse\/([A-Z][A-Z0-9_]+-\d+)(?:[/?#]|$)/i;

function getIssueKeyFromUrl(url) {
  if (!url) {
    return null;
  }

  const match = url.match(ISSUE_KEY_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

function normalizeTicketUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch (error) {
    return url.split(/[?#]/)[0];
  }
}

function getAuthHeaders(instance) {
  const authType = (instance.authType || "basic").toLowerCase();

  if (authType === "bearer") {
    return {
      Authorization: "Bearer " + instance.accessKey
    };
  }

  return {
    Authorization: "Basic " + btoa((instance.login || "") + ":" + (instance.accessKey || ""))
  };
}

function getJsonHeaders(instance) {
  return Object.assign({
    Accept: "application/json",
    "Content-Type": "application/json"
  }, getAuthHeaders(instance));
}

async function jiraRequest(instance, path, options) {
  if (!instance || !instance.baseUrl || !instance.login || !instance.accessKey) {
    throw new Error("Instance settings are incomplete.");
  }

  const response = await fetch(instance.baseUrl + path, Object.assign({
    method: "GET",
    headers: getJsonHeaders(instance)
  }, options || {}));

  if (response.status >= 200 && response.status < 300) {
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  let message = "Jira request failed with status " + response.status;
  try {
    const data = await response.json();
    if (Array.isArray(data.errorMessages) && data.errorMessages.length) {
      message = data.errorMessages.join(" ");
    } else if (data.errors && typeof data.errors === "object") {
      message = Object.keys(data.errors).map(function (key) {
        return key + ": " + data.errors[key];
      }).join(" ");
    }
  } catch (error) {
    const text = await response.text().catch(function () {
      return "";
    });
    if (text) {
      message = text;
    }
  }

  throw new Error(message);
}

async function getInstanceForTicket(ticket) {
  if (!ticket || !ticket.instanceId) {
    throw new Error("Ticket instance is missing.");
  }

  const instances = await StorageAPI.getInstances();
  const instance = instances.find(function (item) {
    return item.id === ticket.instanceId;
  });

  if (!instance) {
    throw new Error("Configured Jira instance was not found.");
  }

  return instance;
}

async function addWorklog(instance, ticketKey, payload) {
  if (!payload || !payload.timeSpent || !payload.timeSpent.trim()) {
    throw new Error("Time spent is required.");
  }

  if (!/^\d+$/.test(payload.timeSpent.trim()) && !/^(?=.*\d)(?:\d+\s*[wdhmWDHM])(?:\s+\d+\s*[wdhmWDHM])*$/i.test(payload.timeSpent.trim())) {
    throw new Error('Invalid Jira time format. Use values like "30m", "1h 30m", or "44".');
  }

  await jiraRequest(instance, "/rest/api/2/issue/" + encodeURIComponent(ticketKey) + "/worklog", {
    method: "POST",
    body: JSON.stringify({
      timeSpent: payload.timeSpent.trim(),
      comment: payload.comment || ("Working on issue " + ticketKey)
    })
  });
}

async function performJiraAction(ticket, action, payload) {
  const instance = await getInstanceForTicket(ticket);
  const ticketKey = ticket.key || getIssueKeyFromUrl(ticket.url);

  if (!ticketKey) {
    throw new Error("Ticket key is missing.");
  }

  if (action === "logWork") {
    await addWorklog(instance, ticketKey, payload || {});
    return { message: "Worklog logged successfully." };
  }

  throw new Error("Unsupported action.");
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { type: "jira:ping" }).catch(function () {
      return null;
    });
  }
});

async function getTabForTicket(ticketUrl) {
  const tabs = await chrome.tabs.query({});
  const targetKey = getIssueKeyFromUrl(ticketUrl);
  const normalizedTargetUrl = normalizeTicketUrl(ticketUrl);

  return tabs.find(function (tab) {
    if (!tab.url) {
      return false;
    }

    const tabKey = getIssueKeyFromUrl(tab.url);
    if (targetKey && tabKey) {
      return tabKey === targetKey;
    }

    return normalizeTicketUrl(tab.url) === normalizedTargetUrl;
  }) || null;
}

async function waitForTabComplete(tabId, timeoutMs) {
  const maxWait = timeoutMs || 15000;

  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for ticket tab to load"));
    }, maxWait);

    function listener(updatedTabId, changeInfo, tab) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function pingTab(tabId, timeoutMs) {
  const maxWait = timeoutMs || 10000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "jira:ping" });
      return true;
    } catch (error) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 300);
      });
    }
  }

  throw new Error("Ticket tab is not ready for Jira automation");
}

async function openTicketTab(ticketUrl) {
  let tab = await getTabForTicket(ticketUrl);

  if (!tab) {
    tab = await chrome.tabs.create({
      url: ticketUrl,
      active: true
    });
  } else {
    await chrome.tabs.update(tab.id, { active: true });
    if (typeof tab.windowId === "number") {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  }

  if (tab.status !== "complete") {
    await waitForTabComplete(tab.id);
  }
  return tab;
}

async function collectSidebarState() {
  return StorageAPI.getData();
}

async function refreshTicketFromOpenTab(ticket) {
  try {
    const tab = await getTabForTicket(ticket.url);
    if (!tab || !tab.id) {
      return ticket;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "jira:scrape" });
    if (!response || !response.ok || !response.ticket) {
      return ticket;
    }

    return Object.assign({}, ticket, {
      title: response.ticket.title || ticket.title,
      status: response.ticket.status || ticket.status,
      assignee: response.ticket.assignee || ticket.assignee,
      timestamp: ticket.timestamp
    });
  } catch (error) {
    return ticket;
  }
}

async function getSidebarData() {
  const data = await collectSidebarState();
  const enrichedRecentTickets = {};
  const instanceIds = Object.keys(data.recentTickets);

  for (const instanceId of instanceIds) {
    const tickets = Array.isArray(data.recentTickets[instanceId]) ? data.recentTickets[instanceId] : [];
    const refreshed = [];

    for (const ticket of tickets) {
      refreshed.push(await refreshTicketFromOpenTab(ticket));
    }

    enrichedRecentTickets[instanceId] = refreshed;
  }

  return {
    instances: data.instances,
    recentTickets: enrichedRecentTickets
  };
}

async function executeTicketAction(payload) {
  if (!payload || !payload.ticket || !payload.ticket.url) {
    throw new Error("Ticket payload is missing");
  }
  return performJiraAction(payload.ticket, payload.action, payload.payload || {});
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  (async function () {
    if (!message || !message.type) {
      throw new Error("Missing background message type");
    }

    if (message.type === "sidebar:getData") {
      return getSidebarData();
    }

    if (message.type === "sidebar:openTicket") {
      const tab = await openTicketTab(message.ticket && message.ticket.url);
      return {
        tabId: tab.id,
        message: "Ticket opened."
      };
    }

    if (message.type === "sidebar:performAction") {
      return executeTicketAction({
        type: "jira:performAction",
        action: message.action,
        payload: message.payload,
        ticket: message.ticket
      });
    }

    if (message.type === "storage:saveInstance") {
      return StorageAPI.saveInstance(message.instance);
    }

    if (message.type === "storage:deleteInstance") {
      await StorageAPI.deleteInstance(message.instanceId);
      return { ok: true };
    }

    if (message.type === "storage:getInstances") {
      return StorageAPI.getInstances();
    }

    throw new Error("Unknown background message");
  })().then(function (result) {
    sendResponse({ ok: true, data: result });
  }).catch(function (error) {
    sendResponse({ ok: false, error: error.message });
  });

  return true;
});
