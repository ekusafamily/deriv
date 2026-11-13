[Wallet](/docs/wallet/)

# List Wallets

Get Auth required

Returns the wallets belonging to the authenticated client, with each balance shown in the wallet's native currency. Supply a conversion_currency to also receive each balance converted into that currency, and use start_date_time and end_date_time to bound the balance as of window.

## Endpoint

Get `/wallet/v1/wallets`

Base URL: `https://api.derivws.com`

## Request Schema

#### `headers` — Required `object`

**Object Properties:**

  ##### `Deriv-App-ID` — Required `string`

  Application identifier. Required for Personal Access Token (PAT) authentication; not required for OAuth Bearer tokens.

  ##### `Authorization` — Required `string`

  Bearer token for authentication

#### `query` — Optional `object`

**Object Properties:**

  ##### `conversion_currency` — Optional `string`

  3-letter ISO currency code. When supplied, balance amounts are additionally returned converted to this currency.

  Pattern: `^[A-Z]{3}$`

  ##### `start_date_time` — Optional `string | integer`

  ISO 8601 timestamp or epoch seconds. Lower bound of the `balance as of` window.

  ##### `end_date_time` — Optional `string | integer`

  ISO 8601 timestamp or epoch seconds. Upper bound of the `balance as of` window.

## Response Schema

#### `data` — Required `array`

One entry per wallet owned by the authenticated client.

**Array Items:**

  ##### `wallet_id` — Required `string`

  Wallet identifier.

  ##### `type` — Required `string`

  Wallet type.

  ##### `balances` — Required `object`

  Balances keyed by 3-letter ISO currency code.

  ##### `total_balance` — Optional `object`

  Only present when `conversion_currency` is set on the request. Shows the wallet's balances summed and converted into the requested currency. Amounts are approximate because FX rates fluctuate.

  **Object Properties:**

    ###### `converted_to` — Required `string`

    Currency the totals were converted into — echoes the request's `conversion_currency`.

    Pattern: `^[A-Z]{3}$`

    ###### `approximate_total_balance` — Required `string`

    Sum of all currency balances converted into `converted_to`.

    ###### `approximate_total_input` — Required `string`

    Sum of all currency inputs converted into `converted_to`.

    ###### `approximate_total_output` — Required `string`

    Sum of all currency outputs converted into `converted_to`.

## Examples

### Request Example

```json
GET /wallet/v1/wallets?conversion_currency=USD
Headers:
  Deriv-App-ID: YOUR_APP_ID   # Required for PAT authentication only
  Authorization: Bearer YOUR_AUTH_TOKEN

Query Parameters:
  - conversion_currency (optional): 3-letter ISO currency code. When supplied,
    balances are additionally returned converted to this currency.
  - start_date_time (optional): ISO 8601 timestamp or epoch seconds. Lower bound
    of the balance as of window.
  - end_date_time (optional): ISO 8601 timestamp or epoch seconds. Upper bound
    of the balance as of window.
```

### Response Example

```json
{
  "data": [
    {
      "wallet_id": "942a2f2d-1f33-4559-994e-42b403033bc6",
      "type": "main",
      "balances": {
        "USD": {
          "balance": "1993.2",
          "input": "2283.2",
          "output": "290"
        }
      },
      "total_balance": {
        "converted_to": "USD",
        "approximate_total_balance": "345.57598013272",
        "approximate_total_input": "382.57598013272",
        "approximate_total_output": "37"
      }
    }
  ]
}
```

## Status Codes

200 OK - Wallets for the authenticated client, with balances in native currencies and optional conversion.

400 Bad request - errors[0].code will be BadRequest.

401 Unauthorized - Missing or invalid Bearer token.

403 Forbidden - Valid token but insufficient scope (payment scope required).

404 Not found - errors[0].code will be NotFound.

500 Internal server error - errors[0].code will be InternalServerError.

503 Service unavailable - Request rejected by the gateway circuit breaker.

504 Gateway timeout - The service did not respond in time.

## Error Responses

400 Bad request

```
{
  "errors": [
    {
      "status": 400,
      "code": "BadRequest",
      "message": "conversion_currency must be a 3-letter ISO currency code"
    }
  ]
}
```

403 Forbidden - insufficient scope

```
{
  "errors": [
    {
      "status": 403,
      "code": "Unauthorized",
      "message": "The payment scope is required for this endpoint"
    }
  ]
}
```

##### Authentication Required

This endpoint requires a Bearer token. When authenticating with a Personal Access Token (PAT), the `Deriv-App-ID` header is required to identify your application ([Authentication](/docs/intro/authentication/)

). OAuth2 Scope: `payment`

## About List Wallets

The `GET /wallet/v1/wallets` endpoint: Returns the wallets belonging to the authenticated client, with each balance shown in the wallet's native currency. Supply a conversion_currency to also receive each balance converted into that currency, and use start_date_time and end_date_time to bound the balance as of window.