# Privacy Policy

Last updated: March 12, 2026

## Summary

Jira Quick Worklog Sidebar does not collect, sell, transmit, or share analytics, tracking data, or personal data with the developer.

The extension stores only the minimum information needed to function, and that information is stored locally in the browser using `chrome.storage.local`.

## What We Store Locally

The extension stores the following data on the user's machine:

- configured Jira instances
- recent Jira tickets visited for each configured instance
- authentication settings entered by the user for their Jira instance

Examples of locally stored data include:

- Jira instance name
- Jira base URL
- installation type (`Cloud` or `Local`)
- login value entered by the user
- authentication type (`Basic` or `Bearer`)
- access key entered by the user
- recent issue key
- recent issue title
- recent issue URL
- recent issue timestamp
- recently scraped assignee information when available

## Where Data Is Stored

All extension data is stored locally in the browser via:

- `chrome.storage.local`

This data is not sent to the developer, a third-party analytics platform, or any remote telemetry service.

## What We Do Not Collect

The extension does not collect:

- analytics data
- usage tracking
- crash reporting
- diagnostics sent to the developer
- advertising identifiers
- browsing history outside the extension's Jira-related behavior
- keystroke logging
- session replay

## Network Requests

The extension may make requests only to the Jira instance configured by the user in order to perform extension features, such as:

- logging work
- validating Jira-related actions
- opening Jira issues in browser tabs

These requests are made directly from the extension to the user's Jira environment using the credentials configured by the user.

The extension does not send this data to any developer-controlled server.

## Debugging and Logging

The extension does not include remote debugging, telemetry, or background reporting.

Any visible success or error messages are shown only inside the extension UI for the user's own session.

## Data Retention

Stored data remains in the browser until the user:

- edits or removes it in the extension settings
- clears extension/browser storage
- uninstalls the extension

The extension currently keeps up to 10 recent tickets per configured Jira instance.

## User Control

Users can control their data by:

- updating or deleting configured Jira instances
- removing the extension
- clearing browser extension storage

## Contact

If you publish this extension publicly, replace this section with the appropriate project or maintainer contact details.
