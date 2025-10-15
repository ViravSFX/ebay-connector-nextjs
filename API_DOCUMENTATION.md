# eBay Connector API Documentation

## Base URL
```
http://localhost:3000/api/ebay
```

## Authentication
All API endpoints require a valid eBay account ID in the URL path. The account must be connected and have valid OAuth tokens.

---

## 1. OAuth & Account Management

### Connect eBay Account
**POST** `/oauth/authorize`

Creates a new eBay account connection and initiates OAuth flow.

**Request Body:**
```json
{
  "friendlyName": "My eBay Store",
  "scopes": ["api_scope", "sell_inventory", "sell_marketing"]
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://auth.ebay.com/oauth2/authorize?...",
  "accountId": "cmg9dr1ei0001jl0443chvsun"
}
```

---

### OAuth Callback
**GET** `/oauth/callback`

Handles OAuth callback from eBay (automatically called by eBay).

**Query Parameters:**
- `code`: Authorization code from eBay
- `state`: State parameter for security validation

---

### List Connected Accounts
**GET** `/accounts`

Returns all connected eBay accounts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmg9dr1ei0001jl0443chvsun",
      "friendlyName": "My eBay Store",
      "ebayUsername": "mystore123",
      "status": "active",
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  ]
}
```

---

## 2. Listing Management

### Create Listing
**POST** `/[accountId]/listings/create`

Creates a complete eBay listing (location → inventory item → offer → publish).

**Request Body:**
```json
{
  "sku": "unique-product-sku-001",

  "location": {
    "merchantLocationKey": "warehouse-01",
    "name": "Main Warehouse",
    "address": {
      "addressLine1": "123 Main Street",
      "city": "San Francisco",
      "stateOrProvince": "CA",
      "postalCode": "94105",
      "country": "US"
    }
  },

  "availability": {
    "shipToLocationAvailability": {
      "quantity": 10
    }
  },

  "condition": "NEW",

  "product": {
    "title": "Product Title (max 80 chars)",
    "description": "Product description (max 4000 chars)",
    "imageUrls": ["https://example.com/image.jpg"],
    "brand": "BrandName",
    "mpn": "MPN-12345",
    "aspects": {
      "Color": ["Black"],
      "Size": ["Medium"]
    }
  },

  "marketplaceId": "EBAY_US",
  "format": "FIXED_PRICE",
  "categoryId": "9355",

  "pricingSummary": {
    "price": {
      "value": "29.99",
      "currency": "USD"
    }
  },

  "availableQuantity": 10,
  "listingDuration": "GTC",

  "listingPolicies": {
    "fulfillmentPolicyId": "123456789",
    "paymentPolicyId": "123456790",
    "returnPolicyId": "123456791"
  },

  "shippingCostOverrides": [
    {
      "priority": 1,
      "shippingCost": {
        "value": "4.99",
        "currency": "USD"
      },
      "shippingServiceType": "ECONOMY"
    }
  ],

  "publish": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "sku": "unique-product-sku-001",
    "steps_completed": ["location_created", "inventory_item_created", "offer_created", "listing_published"],
    "details": {
      "location": "",
      "inventoryItem": "",
      "offer": {
        "offerId": "75429839011"
      },
      "listing": {
        "listingId": "123456789012"
      }
    }
  },
  "message": "Listing created and published successfully - now live on eBay!",
  "metadata": {
    "account_used": "My eBay Store",
    "account_id": "cmg9dr1ei0001jl0443chvsun",
    "publish_requested": true
  }
}
```

**Response (Partial Success - Not Published):**
```json
{
  "success": true,
  "data": {
    "sku": "unique-product-sku-001",
    "steps_completed": ["inventory_item_created", "offer_created"],
    "details": {
      "location": null,
      "inventoryItem": "",
      "offer": {
        "offerId": "75643550011"
      },
      "listing": null
    }
  },
  "message": "Listing created but not published. Check the error for details.",
  "publishError": "Missing fulfillment policy",
  "metadata": {
    "account_used": "My eBay Store",
    "account_id": "cmg9dr1ei0001jl0443chvsun"
  }
}
```

---

### Get Listings
**GET** `/[accountId]/listings`

Retrieves all listings for an eBay account.

**Query Parameters:**
- `limit`: Number of results (default: 25, max: 200)
- `offset`: Pagination offset (default: 0)
- `sku`: Filter by SKU

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "limit": 25,
    "offset": 0,
    "inventoryItems": [
      {
        "sku": "product-001",
        "product": {
          "title": "Product Title",
          "imageUrls": ["https://..."]
        },
        "availability": {
          "shipToLocationAvailability": {
            "quantity": 10
          }
        },
        "condition": "NEW"
      }
    ]
  }
}
```

---

### Get Single Listing
**GET** `/[accountId]/listings/[sku]`

Retrieves details of a specific listing by SKU.

**Response:**
```json
{
  "success": true,
  "data": {
    "sku": "product-001",
    "product": {
      "title": "Product Title",
      "description": "Full description",
      "imageUrls": ["https://..."],
      "brand": "BrandName",
      "mpn": "MPN-12345"
    },
    "condition": "NEW",
    "availability": {
      "shipToLocationAvailability": {
        "quantity": 10
      }
    }
  }
}
```

---

### Update Listing
**PUT** `/[accountId]/listings/[sku]`

Updates an existing inventory item.

**Request Body:**
```json
{
  "product": {
    "title": "Updated Title",
    "description": "Updated description"
  },
  "availability": {
    "shipToLocationAvailability": {
      "quantity": 20
    }
  }
}
```

---

### Delete Listing
**DELETE** `/[accountId]/listings/[sku]`

Deletes an inventory item and all associated offers.

**Response:**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

---

## 3. Offer Management

### Get Offers
**GET** `/[accountId]/offers`

Retrieves all offers for an account.

**Query Parameters:**
- `sku`: Filter by SKU
- `limit`: Number of results
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "offers": [
      {
        "offerId": "75429839011",
        "sku": "product-001",
        "status": "PUBLISHED",
        "pricingSummary": {
          "price": {
            "value": "29.99",
            "currency": "USD"
          }
        },
        "listingId": "123456789012"
      }
    ]
  }
}
```

---

### Publish Offer
**POST** `/[accountId]/offers/[offerId]/publish`

Publishes an unpublished offer to eBay.

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": "123456789012",
    "warnings": []
  },
  "message": "Offer published successfully"
}
```

---

### Withdraw Offer
**POST** `/[accountId]/offers/[offerId]/withdraw`

Withdraws a published offer from eBay.

**Response:**
```json
{
  "success": true,
  "message": "Offer withdrawn successfully",
  "data": {
    "listingId": "123456789012",
    "statusCode": 200
  }
}
```

---

## 4. Location Management

### Get Locations
**GET** `/[accountId]/locations`

Retrieves all inventory locations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "merchantLocationKey": "warehouse-01",
      "name": "Main Warehouse",
      "address": {
        "addressLine1": "123 Main St",
        "city": "San Francisco",
        "stateOrProvince": "CA",
        "postalCode": "94105",
        "country": "US"
      },
      "locationTypes": ["WAREHOUSE"],
      "merchantLocationStatus": "ENABLED"
    }
  ]
}
```

---

## 5. Orders & Fulfillment

### Get Orders
**GET** `/[accountId]/orders`

Retrieves orders for the account.

**Query Parameters:**
- `filter`: Order filter (e.g., "orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}")
- `limit`: Number of results
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "orders": [
      {
        "orderId": "01-12345-67890",
        "orderDate": "2024-01-15T10:30:00Z",
        "orderFulfillmentStatus": "NOT_STARTED",
        "orderPaymentStatus": "PAID",
        "pricingSummary": {
          "total": {
            "value": "49.99",
            "currency": "USD"
          }
        },
        "lineItems": [
          {
            "lineItemId": "1234567890",
            "sku": "product-001",
            "title": "Product Title",
            "quantity": 1,
            "lineItemCost": {
              "value": "29.99",
              "currency": "USD"
            }
          }
        ]
      }
    ]
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error message",
  "errors": ["field1 is required", "field2 must be a number"]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "eBay authentication failed",
  "error": "Access token expired or invalid"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "An unexpected error occurred",
  "error": "Error details..."
}
```

---

## Common Field Values

### Condition Values
- `NEW`
- `LIKE_NEW`
- `NEW_OTHER`
- `NEW_WITH_DEFECTS`
- `MANUFACTURER_REFURBISHED`
- `CERTIFIED_REFURBISHED`
- `EXCELLENT_REFURBISHED`
- `VERY_GOOD_REFURBISHED`
- `GOOD_REFURBISHED`
- `SELLER_REFURBISHED`
- `USED_EXCELLENT`
- `USED_VERY_GOOD`
- `USED_GOOD`
- `USED_ACCEPTABLE`
- `FOR_PARTS_OR_NOT_WORKING`

### Marketplace IDs
- `EBAY_US` - United States
- `EBAY_GB` - United Kingdom
- `EBAY_DE` - Germany
- `EBAY_AU` - Australia
- `EBAY_CA` - Canada

### Format Types
- `FIXED_PRICE` - Buy It Now listing
- `AUCTION` - Auction style listing

### Listing Duration
- `GTC` - Good Till Cancelled
- `DAYS_3`
- `DAYS_5`
- `DAYS_7`
- `DAYS_10`
- `DAYS_30`

### Shipping Service Types
- `ECONOMY`
- `STANDARD`
- `EXPEDITED`
- `ONE_DAY`

---

## Rate Limits

- OAuth token refresh: Max 1 per minute
- Listing creation: Max 5,000 per day
- API calls: Max 5,000 per hour

---

## Notes

1. **Business Policies**: Store accounts should use `listingPolicies` with policy IDs. Basic accounts may need to provide inline shipping details.

2. **SKU Requirements**: SKUs must be unique within your account and can contain letters, numbers, hyphens, and underscores (max 50 characters).

3. **Image Requirements**:
   - At least one image URL required
   - Must be HTTPS URLs
   - Recommended size: 800x800 pixels minimum
   - Supported formats: JPEG, PNG, GIF

4. **Token Management**: The API automatically refreshes expired access tokens using refresh tokens.

5. **Sandbox vs Production**: Set `EBAY_SANDBOX=true` in environment variables for sandbox testing.