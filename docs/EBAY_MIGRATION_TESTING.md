# eBay Migration Testing Guide

This guide helps you test the migration of legacy Trading API listings to the modern Inventory API.

## Overview

Your eBay account has **1,672 legacy listings** created through the Trading API. These need to be migrated to the Inventory API for better features and performance.

## Prerequisites

1. Ensure your development server is running: `npm run dev`
2. Have your eBay account ID ready (check database or use the accounts endpoint)
3. Note: Migration requires Business Policies enabled on your eBay account

## Available Endpoints

### 1. View Legacy Listings (Trading API)
```bash
# Get all legacy listings
curl -X GET "http://localhost:3000/api/ebay/[ACCOUNT_ID]/legacy-listings"

# Get listings with specific date range
curl -X GET "http://localhost:3000/api/ebay/[ACCOUNT_ID]/legacy-listings?startTime=2024-01-01&endTime=2024-12-31"

# Compare with Inventory API
curl -X GET "http://localhost:3000/api/ebay/[ACCOUNT_ID]/legacy-listings?compare=true"
```

### 2. View Current Inventory (Inventory API)
```bash
# Get inventory items
curl -X GET "http://localhost:3000/api/ebay/[ACCOUNT_ID]/listings?limit=100"
```

### 3. Check Migration Status
```bash
# Get migration analysis
curl -X GET "http://localhost:3000/api/ebay/[ACCOUNT_ID]/migrate-listings"
```

This will show:
- Total legacy listings
- Total inventory items
- Listings needing migration
- Already migrated listings

### 4. Test Single Product Migration
```bash
# Replace [ITEM_ID] with an actual eBay item ID from your legacy listings
curl -X POST "http://localhost:3000/api/ebay/[ACCOUNT_ID]/migrate-single" \
  -H "Content-Type: application/json" \
  -d '{"listingId": "[ITEM_ID]"}'
```

### 5. Bulk Migration
```bash
# Test mode - migrates first 5 items
curl -X POST "http://localhost:3000/api/ebay/[ACCOUNT_ID]/migrate-listings" \
  -H "Content-Type: application/json" \
  -d '{
    "listingIds": ["ITEM_ID_1", "ITEM_ID_2", "ITEM_ID_3"],
    "testMode": true,
    "autoCreateSKU": true
  }'

# Full migration (use with caution)
curl -X POST "http://localhost:3000/api/ebay/[ACCOUNT_ID]/migrate-listings" \
  -H "Content-Type: application/json" \
  -d '{
    "listingIds": ["ITEM_ID_1", "ITEM_ID_2"],
    "testMode": false,
    "autoCreateSKU": true
  }'
```

## Step-by-Step Testing Process

### Step 1: Get Your Account ID
```bash
curl -X GET "http://localhost:3000/api/ebay-accounts"
```
Look for your account ID in the response.

### Step 2: Check Your Legacy Listings
```bash
curl -X GET "http://localhost:3000/api/ebay/YOUR_ACCOUNT_ID/legacy-listings?limit=5"
```
Note down some item IDs from the response.

### Step 3: Check Migration Status
```bash
curl -X GET "http://localhost:3000/api/ebay/YOUR_ACCOUNT_ID/migrate-listings"
```
This shows which listings need migration.

### Step 4: Test Single Migration
Pick one item ID and test:
```bash
curl -X POST "http://localhost:3000/api/ebay/YOUR_ACCOUNT_ID/migrate-single" \
  -H "Content-Type: application/json" \
  -d '{"listingId": "YOUR_ITEM_ID"}'
```

### Step 5: Review Results
Check the response for:
- Success/failure status
- Error messages (especially about Business Policies)
- Created inventory SKU

## Common Issues and Solutions

### Issue 1: 404 Resource Not Found
**Cause**: The bulk_migrate_listing API endpoint might not be available.
**Solution**: Your account may not support bulk migration. Continue using both APIs.

### Issue 2: Business Policies Required
**Error**: "Business policies are required"
**Solution**:
1. Enable Business Policies in your eBay Seller Hub
2. Or continue using Trading API for legacy listings

### Issue 3: Auth Token Expired
**Error**: "Auth token is hard expired"
**Solution**: Reconnect your eBay account through the OAuth flow.

### Issue 4: Invalid Listing Type
**Error**: "Only Fixed-Price listings can be migrated"
**Solution**: Auction-style listings cannot be migrated. They must be recreated.

## Alternative Approach (If Migration Fails)

If bulk migration is not supported for your account:

1. **Continue using both APIs in parallel:**
   - Legacy listings: `/api/ebay/[accountId]/legacy-listings`
   - New listings: `/api/ebay/[accountId]/listings`

2. **Create new listings in Inventory API:**
   - Use the Inventory API for all new listings
   - Gradually phase out Trading API listings

3. **Manual recreation:**
   - End legacy listings when they expire
   - Recreate them using the Inventory API

## Monitoring Migration Progress

Use this endpoint to track progress:
```bash
watch -n 10 'curl -s "http://localhost:3000/api/ebay/YOUR_ACCOUNT_ID/migrate-listings" | jq .data.summary'
```

This will update every 10 seconds showing:
- Total legacy listings
- Total inventory items
- Needs migration count
- Already migrated count

## Notes

- **SKU Generation**: If a legacy listing doesn't have a SKU, one will be generated as `MIGRATED-[ITEM_ID]`
- **Test Mode**: Always use `testMode: true` first to test with 5 items
- **Pagination**: Legacy listings API supports up to 200 items per page
- **Rate Limits**: Be mindful of eBay's API rate limits when migrating many items

## Support

If you encounter issues:
1. Check the console logs in your development server
2. Review the error messages in API responses
3. Verify your eBay account has the necessary permissions
4. Ensure OAuth token has required scopes