# Alchemy MCP Plugin

This MCP plugin provides integration with the Alchemy SDK for blockchain and NFT operations.

## Features

- Get NFTs for a wallet address
- Get NFT metadata
- Get latest block number
- More endpoints can be added as needed

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Configure your Alchemy API key:
   - Get an API key from [Alchemy](https://www.alchemy.com/)
   - Update the `ALCHEMY_API_KEY` in `settings.json`

4. Start the server:
```bash
npm start
```

## Available Endpoints

### 1. Get NFTs for Owner
```typescript
POST /getNftsForOwner
{
    "owner": "wallet_address"
}
```

### 2. Get NFT Metadata
```typescript
POST /getNftMetadata
{
    "contractAddress": "contract_address",
    "tokenId": "token_id"
}
```

### 3. Get Block Number
```typescript
POST /getBlockNumber
```

## Error Handling

All endpoints include proper error handling and logging. Errors are returned in the format:
```json
{
    "error": "Error message"
}
```

## Logging

The server implements comprehensive logging using console.error for better debugging:
- [Setup] logs for initialization
- [API] logs for API calls
- [Error] logs for error handling
