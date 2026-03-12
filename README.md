# Jira Quick Worklog Sidebar

Jira Quick Worklog Sidebar is a lightweight browser extension for logging work directly from a side panel while browsing Jira issues.

It is built as a Manifest V3 extension for Chromium-based browsers and is currently focused on a simple workflow:

- detect recently visited Jira issues
- open an issue in a browser tab
- log work time with a default description

This project is inspired by and based on request patterns from [`jira-cli`](https://github.com/ankitpokhrel/jira-cli).

## Features

- Side panel UI for recent Jira issues
- Multiple Jira instance configuration
- Recent issue tracking per instance
- Quick worklog logging
- Default worklog description: `Working on issue <ISSUE-KEY>`
- Simple Jira-style time validation

## Supported Browsers

- Microsoft Edge
- Google Chrome
- Brave

## Installation

Load the extension as an unpacked extension from the `extension` directory.

### Edge

1. Open `edge://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder

### Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder

### Brave

1. Open `brave://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder

## Configuration

Open the side panel and click the gear icon to configure one or more Jira instances.

Each Jira instance currently supports the following settings:

- `Name`: Friendly label shown in the sidebar
- `Base URL`: Jira base URL, for example `https://jira.company.com`
- `Installation`:
  - `Cloud` for Atlassian Cloud
  - `Local` for self-hosted Jira, Jira Data Center, or Jira Server
- `Login`:
  - Cloud: your Atlassian account email
  - Local: your Jira username unless your environment uses something different
- `Auth Type`:
  - `Basic`
  - `Bearer`
- `Access Key`: the token, PAT, or password used for authentication

## Access Key Setup

## Jira Cloud

For Jira Cloud, use an Atlassian API token.

1. Sign in to your Atlassian account
2. Open the API token management page:
   - [Manage API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Create a new API token
4. Copy the token and store it securely
5. Configure the extension with:
   - `Installation`: `Cloud`
   - `Login`: your Atlassian email
   - `Auth Type`: `Basic`
   - `Access Key`: your API token

Reference:
- [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

## Self-Hosted Jira / Jira Data Center / Jira Server

The correct setup depends on how your Jira instance is configured.

### Option 1: Personal Access Token

If your Jira instance supports Personal Access Tokens, this is usually the preferred approach.

Use:
- `Installation`: `Local`
- `Login`: your Jira username
- `Auth Type`: `Bearer`
- `Access Key`: your PAT

References:
- [Personal access token](https://developer.atlassian.com/server/jira/platform/personal-access-token/)
- [Using Personal Access Tokens](https://confluence.atlassian.com/display/ENTERPRISE/Using%2BPersonal%2BAccess%2BTokens)

### Option 2: Basic Authentication

Some self-hosted Jira environments still allow username/password authentication.

Use:
- `Installation`: `Local`
- `Login`: your Jira username
- `Auth Type`: `Basic`
- `Access Key`: your Jira password

Important:
- Availability depends on your company Jira configuration
- Some organizations disable password-based API access entirely

## Worklog Usage

Each issue card provides:

- an `Open Ticket` button
- a description field
- a time field
- a `Log Time` button

Default values:

- Description: `Working on issue <ISSUE-KEY>`
- Time: `30m`

Accepted time examples:

- `30m`
- `1h`
- `1h 30m`
- `2d 1h`
- `44`

If the time format is invalid, the extension shows a validation error before sending the request.

## Troubleshooting

### "Instance settings are incomplete."

One or more required Jira instance fields are missing.

### "Jira request failed"

Common causes include:

- incorrect base URL
- incorrect login
- incorrect access key
- incorrect auth type
- missing Jira permissions
- corporate firewall or network restrictions

### Browser-specific issues

If one Chromium browser works and another does not, check:

- extension permissions
- privacy or shields settings
- network access to the Jira instance from that browser profile

## Notes

- Settings are stored in `chrome.storage.local`
- The extension stores up to 10 recent issues per Jira instance
- The current implementation is focused on worklog logging
