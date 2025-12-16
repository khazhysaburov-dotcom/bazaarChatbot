# MCP OAuth2 Authorization Flow with Keycloak

This document explains how OAuth2 authorization works between an MCP (Model Context Protocol) server, Keycloak (Authorization Server), and an MCP client (like the MCP Inspector or Antigravity IDE).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Components](#components)
3. [The Authorization Flow](#the-authorization-flow)
4. [Key Endpoints](#key-endpoints)
5. [Token Validation](#token-validation)
6. [Configuration Checklist](#configuration-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP CLIENT                                      │
│                    (MCP Inspector / Antigravity IDE)                        │
│                         http://localhost:6274                                │
└─────────────────────────────────────────────────────────────────────────────┘
                │                                              │
                │ 1. Discover Auth Server                      │ 4. Request with
                │    (GET /.well-known/oauth-protected-resource)│    Bearer Token
                ▼                                              ▼
┌────────────────────────────┐              ┌────────────────────────────────┐
│      KEYCLOAK              │              │       MCP SERVER               │
│   (Authorization Server)   │◄─────────────│    (Resource Server)           │
│  http://localhost:8080     │  5. Validate │   http://localhost:3000/mcp    │
│                            │     Token    │                                │
│  /realms/master/protocol/  │   (Introspect)│   Validates token audience    │
│  openid-connect/...        │              │   against resource_url         │
└────────────────────────────┘              └────────────────────────────────┘
         │         ▲
         │         │
         │ 2. Authorization Code Flow
         │    (User logs in)
         │         │
         ▼         │
┌─────────────────────────────┐
│         USER                │
│   (Browser Login Page)      │
└─────────────────────────────┘
```

---

## Components

### 1. MCP Client

The application that wants to call MCP tools. Examples:

- **MCP Inspector**: A web-based tool for testing MCP servers
- **Antigravity IDE**: An IDE with MCP integration

### 2. Keycloak (Authorization Server)

An open-source Identity and Access Management solution that:

- Hosts user accounts
- Issues OAuth2 access tokens
- Validates tokens via introspection
- Manages OAuth2 clients and scopes

### 3. MCP Server (Resource Server)

Your FastMCP server that:

- Exposes MCP tools (like `calculate_sum`, `secret_data`)
- Requires valid access tokens for protected endpoints
- Validates tokens by calling Keycloak's introspection endpoint

---

## The Authorization Flow

### Step 1: Client Discovers Protected Resource Metadata

The MCP client first needs to know how to authenticate. It does this by fetching the **Protected Resource Metadata** from the MCP server.

**Request:**

```http
GET http://localhost:3000/.well-known/oauth-protected-resource
```

**Response:**

```json
{
  "resource": "http://localhost:3000/mcp",
  "authorization_servers": ["http://localhost:8080/realms/master"],
  "scopes_supported": ["mcp:tools"],
  "bearer_methods_supported": ["header", "body"]
}
```

**Key Fields:**

- `resource`: The **audience** (`aud`) that must be in the token
- `authorization_servers`: Where to get tokens (Keycloak)
- `scopes_supported`: What scopes are required

### Step 2: Client Fetches Authorization Server Metadata

The client then fetches Keycloak's OpenID Connect configuration:

**Request:**

```http
GET http://localhost:8080/realms/master/.well-known/openid-configuration
```

**Response (partial):**

```json
{
    "issuer": "http://localhost:8080/realms/master",
    "authorization_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/auth",
    "token_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token",
    "introspection_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token/introspect",
    ...
}
```

### Step 3: User Authentication (Authorization Code Flow)

The client redirects the user to Keycloak's login page:

```http
GET http://localhost:8080/realms/master/protocol/openid-connect/auth
    ?response_type=code
    &client_id=mcp-server
    &redirect_uri=http://localhost:6274/callback
    &scope=openid mcp:tools
    &state=random_state_value
```

The user logs in, and Keycloak redirects back with an authorization code:

```http
GET http://localhost:6274/callback?code=AUTH_CODE&state=random_state_value
```

### Step 4: Client Exchanges Code for Token

The client exchanges the authorization code for an access token:

**Request:**

```http
POST http://localhost:8080/realms/master/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=http://localhost:6274/callback
&client_id=mcp-server
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_token": "..."
}
```

### Step 5: Client Calls MCP Server with Token

The client includes the access token in requests to the MCP server:

**Request:**

```http
POST http://localhost:3000/mcp
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
        "name": "calculate_sum",
        "arguments": {"a": 5, "b": 3}
    },
    "id": 1
}
```

### Step 6: MCP Server Validates Token

The MCP server validates the token by calling Keycloak's introspection endpoint:

**Request (Server → Keycloak):**

```http
POST http://localhost:8080/realms/master/protocol/openid-connect/token/introspect
Content-Type: application/x-www-form-urlencoded

token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
&client_id=mcp-server
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**

```json
{
  "active": true,
  "aud": "http://localhost:3000/mcp",
  "client_id": "mcp-server",
  "scope": "openid mcp:tools",
  "exp": 1702677123,
  "iat": 1702676823,
  "sub": "user-uuid"
}
```

### Step 7: Server Validates Audience

The server checks if the token's `aud` (audience) matches its expected resource URL:

```python
# In token_verifier.py
expected_resource_url = "http://localhost:3000/mcp"
token_audience = introspection_response["aud"]  # "http://localhost:3000/mcp"

if token_audience == expected_resource_url:
    # ✅ Token is valid for this server
    allow_request()
else:
    # ❌ Token was issued for a different server
    return 401 Unauthorized
```

### Step 8: Server Responds

If validation passes, the server processes the request and returns the result.

---

## Client Authentication Types

Understanding why some clients need secrets and others don't is crucial.

### 1. Confidential Clients (e.g., MCP Inspector)

- **What**: Apps running in a secure environment (like a server or local dev tool) that can keep a secret.
- **Requirement**: MUST provide `client_secret` to Keycloak to exchange code for token.
- **Why**: Keycloak ensures only the registered application can get tokens.
- **Your Setup**: The `mcp-server` client is configured as **Confidential** (`publicClient: false`), so the Inspector asks for the secret.

### 2. Public Clients (e.g., IDEs / Mobile Apps)

- **What**: Apps installed on user devices where source code is accessible.
- **Requirement**: Cannot safely store secrets. Instead, they use **PKCE** (Proof Key for Code Exchange) to verify identity dynamically.
- **Behavior**: IDEs like Antigravity often act as Public Clients (or securely cached Confidential Clients), so they might not prompt for a secret every time. If your Keycloak client enforces secrets, the IDE is likely storing it securely in your Keychain/Credential Manager after the first setup.

---

## Advanced: Manual Session Management

If you strictly require `streamable-http` with a client that doesn't support session persistence (like MCP Inspector in "Direct" mode), you can use this manual workflow:

1.  **Start Server**: Run `python server.py` (configured for streamable-http).
2.  **Connect & Fail**: Attempt connection in Inspector (it will fail with "Missing session ID").
3.  **Find ID**: Check terminal logs for: `Created new transport with session ID: <ID>`.
4.  **Configure Header**:
    - In Inspector "Custom Headers", add:
    - Key: `Mcp-Session-Id`
    - Value: `<PASTE_ID_FROM_LOGS>`
5.  **Reconnect**: Click Connect again.

_Note: Restarting the server kills the session, requiring a new ID._

---

## Key Endpoints

| Endpoint                                    | Host       | Purpose                               |
| ------------------------------------------- | ---------- | ------------------------------------- |
| `/.well-known/oauth-protected-resource`     | MCP Server | Tells clients how to authenticate     |
| `/.well-known/openid-configuration`         | Keycloak   | OpenID Connect discovery              |
| `/protocol/openid-connect/auth`             | Keycloak   | User login page                       |
| `/protocol/openid-connect/token`            | Keycloak   | Exchange code for tokens              |
| `/protocol/openid-connect/token/introspect` | Keycloak   | Validate tokens                       |
| `/mcp`                                      | MCP Server | Streamable HTTP MCP endpoint          |
| `/sse`                                      | MCP Server | SSE transport endpoint (if using SSE) |

---

## Token Validation

### The Audience (`aud`) Claim

The most critical validation is the **audience check**. The `aud` claim in the token MUST match the MCP server's resource URL.

**Three places must agree:**

1. **Keycloak Audience Mapper**: Injects `aud` claim into tokens

   - Configured in: Client Scopes → mcp:tools → Mappers → audience-config
   - Value: `http://localhost:3000/mcp`

2. **MCP Server Token Verifier**: Expects this audience

   - Configured in: `server.py` → `RESOURCE_URL`
   - Used for validation in `token_verifier.py`

3. **Protected Resource Metadata**: Tells clients what audience to expect
   - Returned by: `/.well-known/oauth-protected-resource`
   - Field: `resource`

**If these don't match, you'll see:**

```
WARNING:token_verifier:Token audience validation failed. Got aud=X, expected match with Y
```

### Token Introspection vs JWT Validation

There are two ways to validate tokens:

| Method                          | Pros                                | Cons                              |
| ------------------------------- | ----------------------------------- | --------------------------------- |
| **Introspection** (what we use) | Always accurate, handles revocation | Requires network call to Keycloak |
| **JWT Validation**              | No network call, faster             | Can't detect revoked tokens       |

Our implementation uses **introspection** for maximum security.

---

## Transport Protocols: SSE vs Streamable HTTP

The MCP protocol supports multiple transports. Understanding the difference is critical for client configuration.

### 1. SSE (Server-Sent Events) - Recommended for Inspector

- **How it works**: The client opens a persistent connection (`EventSource`) to receive updates from the server and uses separate HTTP POST requests for sending data.
- **State Management**: The connection itself represents the session.
- **Pros**: Simple, widely supported in browsers, works natively with MCP Inspector "Direct" connection.
- **Cons**: Requires two separate channels (one for reading, one for writing).

### 2. Streamable HTTP (Long Polling/Streaming)

- **How it works**: Uses standard HTTP POST requests for bidirectional communication.
- **State Management**: **CRITICAL** - Relies on a `Mcp-Session-Id` header.
  1. Client sends initial request.
  2. Server responds with `Mcp-Session-Id` header.
  3. Client **MUST** match this ID in all subsequent headers.
- **The Issue**: Many simple clients (like the MCP Inspector in "Direct" mode) do not automatically persist custom headers like `Mcp-Session-Id` between requests. This causes "Missing session ID" or "Unauthorized" errors because the server treats every request as a new, unauthenticated session.
- **When to use**: Best for production IDE integrations (like Antigravity/Cursor) or when using a dedicated MCP Proxy that handles session management.

### Configuration Differences

| Feature                 | SSE Config                  | Streamable HTTP Config            |
| ----------------------- | --------------------------- | --------------------------------- |
| **Server Code**         | `app = mcp.sse_app()`       | `app = mcp.streamable_http_app()` |
| **Endpoint**            | `/sse`                      | `/mcp`                            |
| **Audience (Keycloak)** | `http://localhost:3000/sse` | `http://localhost:3000/mcp`       |
| **mcp.json Type**       | `"type": "sse"`             | `"type": "http"`                  |
| **mcp.json URL**        | `http://localhost:3000/sse` | `http://localhost:3000/mcp`       |

---

## Configuration Checklist

### Keycloak Configuration

Run `python configure_keycloak.py` to automatically configure:

- [x] **Client Scope** `mcp:tools` created
- [x] **Audience Mapper** injects correct `aud` claim
- [x] **Client** `mcp-server` created with:
  - Client Authentication: ON
  - Service Accounts: ON
  - Redirect URIs: `*` (for development)
  - Web Origins: `*` (CORS)
- [x] **Trusted Hosts** policy allows local development

### MCP Server Configuration

- [x] `RESOURCE_URL` matches Keycloak audience
- [x] `token_verifier` uses correct introspection endpoint
- [x] `/.well-known/oauth-protected-resource` returns correct metadata
- [x] CORS middleware enabled for browser clients
- [x] **Transport matches Endpoints**: Ensure `configure_keycloak.py` audience matches the `server.py` transport choice.

### Client Configuration (mcp.json)

**For SSE (Recommended):**

```json
{
  "servers": {
    "my-mcp-server": {
      "url": "http://localhost:3000/sse",
      "type": "sse"
    }
  }
}
```

**For Streamable HTTP:**

```json
{
  "servers": {
    "my-mcp-server": {
      "url": "http://localhost:3000/mcp",
      "type": "http"
    }
  }
}
```

---

## Troubleshooting

### Error: "Token audience validation failed"

**Cause:** The `aud` claim in the token doesn't match what the server expects.

**Fix:**

1. Check Keycloak audience mapper: `MCP_SERVER_AUDIENCE` in `configure_keycloak.py`
2. Check server resource URL: `RESOURCE_URL` in `server.py`
3. Run `python configure_keycloak.py` to update Keycloak
4. Restart the MCP server

### Error: "CORS policy blocked"

**Cause:** Browser is blocking cross-origin requests.

**Fix:**

1. Ensure CORS middleware is added in `server.py`
2. Ensure Keycloak client has `webOrigins: ["*"]`
3. Run `python configure_keycloak.py` to update

### Error: "Invalid redirect_uri"

**Cause:** Keycloak doesn't allow the callback URL.

**Fix:**

1. Ensure Keycloak client has `redirectUris: ["*"]`
2. Run `python configure_keycloak.py` to update

### Error: "401 Unauthorized" but token is valid

**Cause:** Usually an audience mismatch or missing scope.

**Debug:**

1. Check server logs for the specific validation failure
2. Decode the JWT at jwt.io to see the `aud` claim
3. Compare with `RESOURCE_URL` in `server.py`

### Error: "404 Not Found" on /.well-known endpoints

**Cause:** The custom route isn't being served.

**Fix:**

1. Ensure `@mcp.custom_route` decorator is present in `server.py`
2. Restart the server after changes

---

## Files Reference

| File                    | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `server.py`             | Main MCP server with OAuth configuration |
| `config.py`             | Environment-based configuration          |
| `token_verifier.py`     | Token validation via introspection       |
| `configure_keycloak.py` | Automatic Keycloak setup script          |

---

## Security Considerations

1. **Never use `*` for redirectUris and webOrigins in production**
   - Use specific allowed origins
2. **Use HTTPS in production**
   - All URLs should be `https://`
3. **Rotate client secrets regularly**
   - Store secrets in environment variables, not in code
4. **Consider JWT validation for performance**
   - Introspection adds latency per request
   - JWT validation can be done locally with Keycloak's public key

---

## Quick Start Commands

```bash
# 1. Start Keycloak (in a separate terminal)
docker run -p 127.0.0.1:8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev

# 2. Configure Keycloak
python configure_keycloak.py

# 3. Start MCP Server
python server.py

# 4. Start MCP Inspector
npx @modelcontextprotocol/inspector

# 5. Connect in Inspector
# URL: http://localhost:3000/mcp
# Transport: streamable-http
```
# switch from SSE to Streamable HTTP:

1. Modify configure_keycloak.py: 
    Change MCP_SERVER_AUDIENCE = "http://localhost:3000/sse"
    To: MCP_SERVER_AUDIENCE = "http://localhost:3000/mcp"
    Action: Run python configure_keycloak.py.
2. Modify  server.py:
    Change TRANSPORT = "sse"
    To: TRANSPORT = "streamable-http"
    Action: Restart the server (python server.py).
3. Modify Client (mcp.json or Inspector):
    Don't forget this part! The client needs to know the new URL and type.
    Change URL to: http://localhost:3000/mcp
    Change Type to: http (instead of sse)


The "Manual Session ID" Workflow
1. Configure for Streamable HTTP (as per your switch.md: modify configure-keycloak to .mcp, run it, modify server.py to streamable-http, restart server).
2. Attempt Connection in Inspector (It will fail).
3. Check Terminal Logs: Look at the output of your running python server.py. You will see a log line like this:
```INFO:mcp.server.streamable_http_manager:Created new transport with session ID: 0b08ce9d43324cfc9a1a9367f8f75a1c```
4. Copy that ID: Copy the long string (e.g., 0b08ce9d43324cfc9a1a9367f8f75a1c).
5. Paste into Inspector:
    Go to Custom Headers.
    Add a header:
    Key: ```Mcp-Session-Id``` (Case sensitive!)
    Value: YOUR_COPIED_ID
6. Retry Connection: Click "Connect" again. Use the same session ID you just configured.
