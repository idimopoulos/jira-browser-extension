(function () {
  const contentEl = document.getElementById("sidebar-content");
  const template = document.getElementById("ticket-template");

  function sendMessage(message) {
    return chrome.runtime.sendMessage(message).then(function (response) {
      if (!response || !response.ok) {
        throw new Error(response && response.error ? response.error : "Extension request failed");
      }

      return response.data;
    });
  }

  function setMessage(element, text, isError) {
    element.textContent = text;
    element.className = "message-line" + (isError ? " error-text" : " success-text");
  }

  function renderEmptyState(message) {
    const card = document.createElement("section");
    card.className = "empty-state";
    card.textContent = message;
    return card;
  }

  function isValidTimeSpent(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return false;
    }

    if (/^\d+$/.test(trimmed)) {
      return true;
    }

    return /^(?=.*\d)(?:\d+\s*[wdhmWDHM])(?:\s+\d+\s*[wdhmWDHM])*$/i.test(trimmed);
  }

  async function performAction(button, messageEl, request) {
    button.disabled = true;

    try {
      const data = await sendMessage(request);
      setMessage(messageEl, data && data.message ? data.message : "Action completed.", false);
      await renderSidebar();
    } catch (error) {
      setMessage(messageEl, error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  function buildTicketCard(ticket) {
    const fragment = template.content.cloneNode(true);
    const root = fragment.querySelector(".ticket-card");
    const keyEl = fragment.querySelector(".ticket-key");
    const titleEl = fragment.querySelector(".ticket-title");
    const assigneeEl = fragment.querySelector(".assignee-line");
    const openTicketButton = fragment.querySelector(".open-ticket-button");
    const commentInput = fragment.querySelector(".comment-input");
    const timeInput = fragment.querySelector(".time-input");
    const logWorkButton = fragment.querySelector(".log-work-button");
    const messageEl = fragment.querySelector(".message-line");

    keyEl.textContent = ticket.key;
    keyEl.href = ticket.url;
    titleEl.textContent = ticket.title || "Untitled Jira issue";
    assigneeEl.textContent = "Assignee: " + (ticket.assignee || "Unassigned");
    commentInput.value = "Working on issue " + ticket.key;

    openTicketButton.addEventListener("click", function () {
      performAction(openTicketButton, messageEl, {
        type: "sidebar:openTicket",
        ticket: ticket
      });
    });

    logWorkButton.addEventListener("click", function () {
      if (!isValidTimeSpent(timeInput.value)) {
        setMessage(messageEl, 'Use Jira time format like "30m", "1h 30m", or "44".', true);
        return;
      }

      performAction(logWorkButton, messageEl, {
        type: "sidebar:performAction",
        action: "logWork",
        ticket: ticket,
        payload: {
          timeSpent: timeInput.value,
          comment: commentInput.value
        }
      });
    });

    return root;
  }

  function buildInstanceSection(instance, tickets) {
    const section = document.createElement("section");
    section.className = "instance-section";

    const heading = document.createElement("h2");
    heading.textContent = instance.name;
    section.appendChild(heading);

    if (!tickets.length) {
      section.appendChild(renderEmptyState("No recent tickets captured yet."));
      return section;
    }

    tickets.forEach(function (ticket) {
      section.appendChild(buildTicketCard(ticket));
    });

    return section;
  }

  async function renderSidebar() {
    contentEl.innerHTML = "";

    try {
      const data = await sendMessage({ type: "sidebar:getData" });
      const instances = Array.isArray(data.instances) ? data.instances : [];

      if (!instances.length) {
        contentEl.appendChild(renderEmptyState("Add a Jira instance in Settings to start tracking tickets."));
        return;
      }

      instances.forEach(function (instance) {
        const tickets = Array.isArray(data.recentTickets[instance.id]) ? data.recentTickets[instance.id] : [];
        contentEl.appendChild(buildInstanceSection(instance, tickets));
      });
    } catch (error) {
      contentEl.appendChild(renderEmptyState(error.message));
    }
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === "local" && changes[StorageAPI.STORAGE_KEY]) {
      renderSidebar();
    }
  });

  renderSidebar();
})();
