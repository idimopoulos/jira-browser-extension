# Jira Quick Worklog Sidebar

Browser side-panel extension for quickly logging work against recently visited Jira issues.

This extension is based on ideas and request patterns from [`jira-cli`](https://github.com/ankitpokhrel/jira-cli).

Current scope:
- Detect recently visited Jira issues from the page URL
- Open a Jira issue in a tab
- Log work time from the side panel

## Load the extension

### Microsoft Edge
1. Open `edge://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder:
   - `C:\Users\Ilias\Documents\projects\jira-logger\extension`

### Chrome
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder:
   - `C:\Users\Ilias\Documents\projects\jira-logger\extension`

### Brave
1. Open `brave://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder:
   - `C:\Users\Ilias\Documents\projects\jira-logger\extension`

## Configure the extension

Open the extension settings from the gear icon in the side panel and add a Jira instance.

Each instance currently uses these fields:

- `Name`: Friendly name shown in the sidebar
- `Base URL`: Jira base URL, for example `https://jira.company.com`
- `Installation`:
  - `Cloud` for Atlassian Cloud
  - `Local` for self-hosted Jira / Jira Data Center / Jira Server
- `Login`:
  - Cloud: your Atlassian account email
  - Local: your Jira username, unless your Jira admin told you to use something else
- `Auth Type`:
  - `Basic` for email/username + token/password style auth
  - `Bearer` for PAT-style auth
- `Access Key`: the API token, PAT, or password used by the extension

## How to obtain an access key

## Jira Cloud

For Jira Cloud, use an Atlassian API token.

1. Sign in to your Atlassian account.
2. Open the API token page:
   - https://id.atlassian.com/manage-profile/security/api-tokens
3. Create a token.
4. Copy the token and save it somewhere safe.
5. In the extension settings use:
   - `Installation`: `Cloud`
   - `Login`: your Atlassian email
   - `Auth Type`: `Basic`
   - `Access Key`: the API token

Notes:
- Atlassian says API tokens may expire, and newer tokens are created with an expiration date.
- You can’t recover the token after creation, so copy it when it is shown.

Official Atlassian documentation:
- [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

## Self-hosted Jira / Jira Data Center / Jira Server

There are two common options.

### Option 1: Personal Access Token (recommended when available)

If your Jira admin has enabled Personal Access Tokens, create a PAT in Jira and use it as the `Access Key`.

Typical setup:
- `Installation`: `Local`
- `Login`: your Jira username
- `Auth Type`: `Bearer`
- `Access Key`: your PAT

Official Atlassian documentation:
- [Personal access token](https://developer.atlassian.com/server/jira/platform/personal-access-token/)
- [Using Personal Access Tokens](https://confluence.atlassian.com/display/ENTERPRISE/Using%2BPersonal%2BAccess%2BTokens)

### Option 2: Username + password/basic auth

Some self-hosted Jira environments still use basic authentication.

Typical setup:
- `Installation`: `Local`
- `Login`: your Jira username
- `Auth Type`: `Basic`
- `Access Key`: your Jira password

Important:
- This depends on how your company Jira is configured.
- Some organizations disable password-based API access and require PATs or another internal method.

## Worklog behavior

When you log time:
- default time is `30m`
- default description is `Working on issue <ISSUE-KEY>`

Accepted time examples:
- `30m`
- `1h`
- `1h 30m`
- `2d 1h`
- `44`

If the format is invalid, the sidebar shows a validation error before sending the request.

## Troubleshooting

### "Instance settings are incomplete"
One or more required fields are missing in the Jira instance settings.

### "Jira request failed"
Usually means one of these:
- wrong base URL
- wrong login
- wrong access key
- wrong auth type
- network/firewall restrictions
- Jira rejected the request because of permissions

### Log Time works in one browser but not another
Check:
- browser extension permissions
- privacy/shields settings
- whether your Jira instance is reachable from that browser profile

## Notes

- Settings are stored in `chrome.storage.local`
- The extension currently keeps only the last 10 visited tickets per Jira instance
- This project currently focuses on worklog logging only
