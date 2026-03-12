(function () {
  const JiraActions = {};

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function waitFor(fn, options) {
    const timeoutMs = options && options.timeoutMs ? options.timeoutMs : 12000;
    const intervalMs = options && options.intervalMs ? options.intervalMs : 250;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const result = fn();
      if (result) {
        return result;
      }
      await sleep(intervalMs);
    }

    throw new Error(options && options.errorMessage ? options.errorMessage : "Timed out waiting for Jira UI");
  }

  function normalizeText(value) {
    return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function getVisibleElements(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(function (element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    });
  }

  function findClickableByText(textCandidates) {
    const targets = textCandidates.map(normalizeText);
    const nodes = getVisibleElements('button, [role="button"], a, span, div');

    return nodes.find(function (node) {
      const label = normalizeText(
        node.getAttribute("aria-label") ||
        node.getAttribute("data-testid") ||
        node.textContent
      );

      return targets.some(function (target) {
        return label === target || label.includes(target);
      });
    }) || null;
  }

  function dispatchInputEvents(input) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function clickElement(element) {
    if (!element) {
      throw new Error("Missing Jira control to click");
    }

    element.scrollIntoView({ block: "center", inline: "center" });
    element.click();
    await sleep(150);
  }

  async function openMoreActionsIfNeeded() {
    const menuButton = findClickableByText(["more", "more actions", "actions"]);
    if (menuButton) {
      await clickElement(menuButton);
      return true;
    }

    return false;
  }

  async function openLogWorkDialog() {
    const directButton = document.querySelector('[data-testid="issue.views.issue-base.foundation.quick-add.quick-add-item.link-issue-log-work"], [data-testid="issue.activity.worklog.log-work-button"]');
    if (directButton) {
      await clickElement(directButton);
      return;
    }

    const textButton = findClickableByText(["log work"]);
    if (textButton) {
      await clickElement(textButton);
      return;
    }

    await openMoreActionsIfNeeded();
    const menuItem = await waitFor(function () {
      return findClickableByText(["log work"]);
    }, {
      errorMessage: 'Could not find the "Log work" action in Jira'
    });
    await clickElement(menuItem);
  }

  async function fillTimeSpent(timeSpent) {
    const input = await waitFor(function () {
      return document.querySelector('input[name="timeSpent"], input[id*="timeSpent"], textarea[name="timeSpent"], input[aria-label*="Time spent"]');
    }, {
      errorMessage: "Time spent field did not appear"
    });

    input.focus();
    input.value = "";
    dispatchInputEvents(input);
    input.value = timeSpent;
    dispatchInputEvents(input);
    await sleep(100);
  }

  async function submitDialog() {
    const submitButton = await waitFor(function () {
      return getVisibleElements('button, [role="button"]').find(function (button) {
        const label = normalizeText(button.textContent || button.getAttribute("aria-label"));
        return label === "save" || label === "log work" || label === "submit" || label === "update";
      });
    }, {
      errorMessage: "Could not find the Jira submit button"
    });

    await clickElement(submitButton);
  }

  async function logWork(timeSpent) {
    if (!timeSpent || !timeSpent.trim()) {
      throw new Error("Time spent is required");
    }

    await openLogWorkDialog();
    await fillTimeSpent(timeSpent.trim());
    await submitDialog();
    return { ok: true };
  }

  function findAssigneeControl() {
    const direct = document.querySelector(
      '[data-testid="issue.views.issue-base.foundation.assignee.assignee-field"], [data-testid="issue.fields.assignee.value"], #assignee-val, [id*="assignee-val"]'
    );

    if (direct) {
      return direct;
    }

    return typeof JiraDetector !== "undefined" && JiraDetector.scrapeAssignee() ? findClickableByText(["assignee"]) : null;
  }

  async function openAssigneeEditor() {
    const control = findAssigneeControl() || findClickableByText(["assignee"]);
    if (!control) {
      throw new Error("Could not find the assignee field");
    }

    await clickElement(control);
    return waitFor(function () {
      return document.querySelector('input[role="combobox"], input[aria-autocomplete], input[type="text"]');
    }, {
      errorMessage: "Assignee editor did not open"
    });
  }

  async function selectAssignee(optionTextCandidates) {
    const options = await waitFor(function () {
      return getVisibleElements('[role="option"], button, div, span').filter(function (element) {
        const text = normalizeText(element.textContent || element.getAttribute("aria-label"));
        return optionTextCandidates.some(function (candidate) {
          return text.includes(candidate);
        });
      });
    }, {
      errorMessage: "Could not find the requested assignee option"
    });

    await clickElement(options[0]);
  }

  async function assignToMe() {
    const input = await openAssigneeEditor();
    input.focus();
    input.value = "";
    dispatchInputEvents(input);
    await sleep(200);
    await selectAssignee(["assign to me", "me", "yourself"]);
    return { ok: true };
  }

  async function unassign() {
    const input = await openAssigneeEditor();
    input.focus();
    input.value = "";
    dispatchInputEvents(input);
    input.value = "unassigned";
    dispatchInputEvents(input);
    await sleep(250);
    await selectAssignee(["unassigned", "none"]);
    return { ok: true };
  }

  function findTransitionTrigger() {
    return document.querySelector(
      '[data-testid="issue.views.issue-base.foundation.status.status-field"], [data-testid="issue.fields.status.value"], #status-val, [id*="status-val"]'
    ) || findClickableByText(["workflow", "status", "transition"]);
  }

  async function openTransitionMenu() {
    const trigger = findTransitionTrigger();
    if (!trigger) {
      throw new Error("Could not find the Jira status control");
    }

    await clickElement(trigger);
    await sleep(250);
  }

  async function getAllowedTransitions() {
    await openTransitionMenu();
    const options = await waitFor(function () {
      const items = getVisibleElements('[role="option"], [role="menuitemradio"], [role="menuitem"], button, div');
      const names = items
        .map(function (element) {
          return (element.textContent || "").trim().replace(/\s+/g, " ");
        })
        .filter(Boolean)
        .filter(function (name, index, list) {
          return list.indexOf(name) === index;
        });

      return names.length ? names : null;
    }, {
      errorMessage: "Could not read Jira transition options"
    });

    return options;
  }

  async function changeStatus(targetStatus) {
    if (!targetStatus) {
      throw new Error("Target status is required");
    }

    await openTransitionMenu();
    const option = await waitFor(function () {
      const target = normalizeText(targetStatus);
      return getVisibleElements('[role="option"], [role="menuitemradio"], [role="menuitem"], button, div').find(function (element) {
        return normalizeText(element.textContent).includes(target);
      });
    }, {
      errorMessage: 'Could not find the requested Jira status "' + targetStatus + '"'
    });

    await clickElement(option);

    const confirmButton = getVisibleElements('button, [role="button"]').find(function (element) {
      const label = normalizeText(element.textContent || element.getAttribute("aria-label"));
      return label === "transition" || label === "save" || label === "done" || label === "confirm";
    });

    if (confirmButton) {
      await clickElement(confirmButton);
    }

    return { ok: true };
  }

  JiraActions.waitFor = waitFor;
  JiraActions.logWork = logWork;
  JiraActions.assignToMe = assignToMe;
  JiraActions.unassign = unassign;
  JiraActions.getAllowedTransitions = getAllowedTransitions;
  JiraActions.changeStatus = changeStatus;

  if (typeof self !== "undefined") {
    self.JiraActions = JiraActions;
  }

  if (typeof window !== "undefined") {
    window.JiraActions = JiraActions;
  }
})();
