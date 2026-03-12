(function () {
  const ISSUE_KEY_PATTERN = /\/browse\/([A-Z][A-Z0-9_]+-\d+)(?:[/?#]|$)/i;

  function getIssueKeyFromUrl(url) {
    if (!url) {
      return null;
    }

    const match = url.match(ISSUE_KEY_PATTERN);
    return match ? match[1].toUpperCase() : null;
  }

  function getTextContent(node) {
    return node ? node.textContent.trim().replace(/\s+/g, " ") : "";
  }

  function findBySelector(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return null;
  }

  function findValueNearLabel(labels) {
    const normalizedLabels = labels.map(function (label) {
      return label.toLowerCase();
    });

    const candidates = Array.from(document.querySelectorAll("div, span, dt, label, strong"));
    for (const candidate of candidates) {
      const text = getTextContent(candidate).toLowerCase().replace(/:$/, "");
      if (!normalizedLabels.includes(text)) {
        continue;
      }

      const sibling = candidate.nextElementSibling;
      if (sibling && getTextContent(sibling)) {
        return sibling;
      }

      const parent = candidate.parentElement;
      if (!parent) {
        continue;
      }

      const children = Array.from(parent.children);
      const index = children.indexOf(candidate);
      if (index >= 0 && children[index + 1] && getTextContent(children[index + 1])) {
        return children[index + 1];
      }
    }

    return null;
  }

  function scrapeStatus() {
    const direct = findBySelector([
      '[data-testid="issue.views.issue-base.foundation.status.status-field"]',
      '[data-testid="issue.fields.status.value"]',
      '#status-val',
      '[id*="status-val"]'
    ]);

    return getTextContent(direct || findValueNearLabel(["status"]));
  }

  function scrapeAssignee() {
    const direct = findBySelector([
      '[data-testid="issue.views.issue-base.foundation.assignee.assignee-field"]',
      '[data-testid="issue.fields.assignee.value"]',
      '#assignee-val',
      '[id*="assignee-val"]'
    ]);

    return getTextContent(direct || findValueNearLabel(["assignee"]));
  }

  function scrapeTitle(issueKey) {
    const heading = findBySelector([
      '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
      '[data-testid="issue.views.issue-base.foundation.summary.heading"] span',
      '#summary-val',
      'h1[data-test-id="issue.views.issue-base.foundation.summary.heading"]',
      'h1'
    ]);

    const headingText = getTextContent(heading);
    if (headingText) {
      return headingText;
    }

    const pageTitle = document.title.replace(/\s*[-|].*$/, "").trim();
    if (pageTitle && issueKey && pageTitle.toUpperCase() !== issueKey.toUpperCase()) {
      return pageTitle;
    }

    return document.title.trim();
  }

  function scrapeTicketSnapshot() {
    const issueKey = getIssueKeyFromUrl(window.location.href);
    if (!issueKey) {
      return null;
    }

    return {
      key: issueKey,
      title: scrapeTitle(issueKey),
      status: scrapeStatus(),
      assignee: scrapeAssignee(),
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  const api = {
    ISSUE_KEY_PATTERN: ISSUE_KEY_PATTERN,
    getIssueKeyFromUrl: getIssueKeyFromUrl,
    scrapeStatus: scrapeStatus,
    scrapeAssignee: scrapeAssignee,
    scrapeTitle: scrapeTitle,
    scrapeTicketSnapshot: scrapeTicketSnapshot
  };

  if (typeof self !== "undefined") {
    self.JiraDetector = api;
  }

  if (typeof window !== "undefined") {
    window.JiraDetector = api;
  }
})();
