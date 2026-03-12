(function () {
  let currentIssueKey = null;
  let captureTimer = null;

  async function getMatchedInstance() {
    return StorageAPI.findInstanceByUrl(window.location.href);
  }

  async function captureCurrentTicket() {
    const instance = await getMatchedInstance();
    const snapshot = JiraDetector.scrapeTicketSnapshot();

    if (!instance || !snapshot) {
      currentIssueKey = null;
      return;
    }

    currentIssueKey = snapshot.key;

    await StorageAPI.upsertRecentTicket(instance.id, {
      key: snapshot.key,
      title: snapshot.title || document.title,
      status: snapshot.status || "",
      assignee: snapshot.assignee || "",
      url: snapshot.url,
      timestamp: Date.now(),
      instanceId: instance.id
    });
  }

  function scheduleCapture(delayMs) {
    window.clearTimeout(captureTimer);
    captureTimer = window.setTimeout(function () {
      captureCurrentTicket().catch(function (error) {
        console.warn("Jira Quick Worklog Sidebar capture failed:", error);
      });
    }, delayMs);
  }

  function handleUrlChange() {
    const nextKey = JiraDetector.getIssueKeyFromUrl(window.location.href);
    if (nextKey !== currentIssueKey) {
      scheduleCapture(300);
    }
  }

  function watchSpaNavigation() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      const result = originalPushState.apply(this, arguments);
      handleUrlChange();
      return result;
    };

    history.replaceState = function () {
      const result = originalReplaceState.apply(this, arguments);
      handleUrlChange();
      return result;
    };

    window.addEventListener("popstate", handleUrlChange);

    const observer = new MutationObserver(function () {
      handleUrlChange();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true
    });
  }

  async function handleMessage(message) {
    if (!message || !message.type) {
      return { ok: false, error: "Missing message type" };
    }

    if (message.type === "jira:ping") {
      return { ok: true, url: window.location.href };
    }

    if (message.type === "jira:scrape") {
      const snapshot = JiraDetector.scrapeTicketSnapshot();
      return { ok: true, ticket: snapshot };
    }

    if (message.type === "jira:performAction") {
      try {
        let result;

        if (message.action === "logWork") {
        } else {
          throw new Error("Unsupported Jira action");
        }

        scheduleCapture(1000);
        return { ok: true, result: result };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }

    return { ok: false, error: "Unknown message type" };
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    handleMessage(message).then(sendResponse);
    return true;
  });

  watchSpaNavigation();
  scheduleCapture(500);
})();
