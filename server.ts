#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Alchemy,
  Network,
  AlchemySubscription,
  GetTransfersForOwnerOptions,
  GetTransfersForOwnerResponse,
} from "alchemy-sdk";
import { McpError as MicrosoftMcpError } from "@microsoft/mcp-core";
import { ServerResult } from "@microsoft/mcp-server";
import { Logger } from "@microsoft/mcp-logger";

// Initialize Alchemy SDK with API key from environment variables
const API_KEY = process.env.ALCHEMY_API_KEY;
if (!API_KEY) {
  throw new Error("ALCHEMY_API_KEY environment variable is required");
}

console.error("[Setup] Initializing Alchemy MCP server...");

// Get network from environment or default to ETH_MAINNET
const networkStr = process.env.ALCHEMY_NETWORK || "ETH_MAINNET";
const network =
  Network[networkStr as keyof typeof Network] || Network.ETH_MAINNET;

console.error(`[Setup] Using network: ${networkStr}`);

// Configure Alchemy SDK
const settings = {
  apiKey: API_KEY,
  network: network,
};

// Create Alchemy instance
const alchemy = new Alchemy(settings);

// Track active subscriptions
let activeSubscriptions: Map<string, { unsubscribe: () => void }> = new Map();

// Import types from alchemy-sdk
import type {
  GetNftsForOwnerOptions,
  GetNftMetadataOptions,
  AssetTransfersParams,
  GetNftSalesOptions,
  GetContractsForOwnerOptions,
  GetOwnersForNftOptions,
  GetTransfersForContractOptions,
  GetTransfersForOwnerOptions,
  TransactionReceiptsParams,
  GetTokensForOwnerOptions,
  GetBaseNftsForContractOptions,
} from "alchemy-sdk";

// Use imported types
type GetNftsForOwnerParams = GetNftsForOwnerOptions & { owner: string };
type GetNftMetadataParams = GetNftMetadataOptions & {
  contractAddress: string;
  tokenId: string;
};
type GetTokenBalancesParams = { address: string; tokenAddresses?: string[] };
type GetAssetTransfersParams = AssetTransfersParams;
type GetNftSalesParams = GetNftSalesOptions & {
  contractAddress?: string;
  tokenId?: string;
};
type GetContractsForOwnerParams = GetContractsForOwnerOptions & {
  owner: string;
};
type GetFloorPriceParams = { contractAddress: string };
type GetOwnersForNftParams = GetOwnersForNftOptions & {
  contractAddress: string;
  tokenId: string;
};
type GetTransfersForContractParams = GetTransfersForContractOptions & {
  contractAddress: string;
};
type GetTransfersForOwnerParams = GetTransfersForOwnerOptions & {
  owner: string;
};
type GetTransactionReceiptsParams = TransactionReceiptsParams;
type GetTokenMetadataParams = { contractAddress: string };
type GetTokensForOwnerParams = GetTokensForOwnerOptions & { owner: string };
type GetNftsForContractParams = GetBaseNftsForContractOptions & {
  contractAddress: string;
};
type GetBlockWithTransactionsParams = {
  blockNumber?: string | number;
  blockHash?: string;
};
type GetTransactionParams = { hash: string };
type ResolveEnsParams = { name: string; blockTag?: string | number };
type LookupAddressParams = { address: string };
type EstimateGasPriceParams = { maxFeePerGas?: boolean };
type SubscribeParams = {
  type: string;
  address?: string;
  topics?: string[];
};
type UnsubscribeParams = {
  subscriptionId: string;
};

// Validation functions for parameters
const isValidGetNftsForOwnerParams = (
  args: any
): args is GetNftsForOwnerParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.owner === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number") &&
    (args.contractAddresses === undefined ||
      Array.isArray(args.contractAddresses)) &&
    (args.withMetadata === undefined || typeof args.withMetadata === "boolean")
  );
};

const isValidGetNftMetadataParams = (
  args: any
): args is GetNftMetadataParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string" &&
    typeof args.tokenId === "string" &&
    (args.tokenType === undefined || typeof args.tokenType === "string") &&
    (args.refreshCache === undefined || typeof args.refreshCache === "boolean")
  );
};

const isValidGetTokenBalancesParams = (
  args: any
): args is GetTokenBalancesParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.address === "string" &&
    (args.tokenAddresses === undefined || Array.isArray(args.tokenAddresses))
  );
};

const isValidGetAssetTransfersParams = (
  args: any
): args is GetAssetTransfersParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    (args.fromBlock === undefined || typeof args.fromBlock === "string") &&
    (args.toBlock === undefined || typeof args.toBlock === "string") &&
    (args.fromAddress === undefined || typeof args.fromAddress === "string") &&
    (args.toAddress === undefined || typeof args.toAddress === "string") &&
    (args.category === undefined || Array.isArray(args.category)) &&
    (args.contractAddresses === undefined ||
      Array.isArray(args.contractAddresses)) &&
    (args.maxCount === undefined || typeof args.maxCount === "number") &&
    (args.excludeZeroValue === undefined ||
      typeof args.excludeZeroValue === "boolean") &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.withMetadata === undefined || typeof args.withMetadata === "boolean")
  );
};

const isValidGetNftSalesParams = (args: any): args is GetNftSalesParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    (args.contractAddress === undefined ||
      typeof args.contractAddress === "string") &&
    (args.tokenId === undefined || typeof args.tokenId === "string") &&
    (args.fromBlock === undefined || typeof args.fromBlock === "number") &&
    (args.toBlock === undefined || typeof args.toBlock === "number") &&
    (args.order === undefined || typeof args.order === "string") &&
    (args.marketplace === undefined || typeof args.marketplace === "string") &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number")
  );
};

const isValidGetContractsForOwnerParams = (
  args: any
): args is GetContractsForOwnerParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.owner === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number") &&
    (args.includeFilters === undefined || Array.isArray(args.includeFilters)) &&
    (args.excludeFilters === undefined || Array.isArray(args.excludeFilters))
  );
};

const isValidGetFloorPriceParams = (args: any): args is GetFloorPriceParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string"
  );
};

const isValidGetOwnersForNftParams = (
  args: any
): args is GetOwnersForNftParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string" &&
    typeof args.tokenId === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number")
  );
};

const isValidGetTransfersForContractParams = (
  args: any
): args is GetTransfersForContractParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.fromBlock === undefined || typeof args.fromBlock === "number") &&
    (args.toBlock === undefined || typeof args.toBlock === "number") &&
    (args.order === undefined || typeof args.order === "string") &&
    (args.tokenType === undefined || typeof args.tokenType === "string")
  );
};

const isValidGetTransfersForOwnerParams = (
  args: any
): args is GetTransfersForOwnerParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.owner === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.fromBlock === undefined || typeof args.fromBlock === "number") &&
    (args.toBlock === undefined || typeof args.toBlock === "number") &&
    (args.order === undefined || typeof args.order === "string") &&
    (args.tokenType === undefined || typeof args.tokenType === "string") &&
    (args.contractAddresses === undefined ||
      Array.isArray(args.contractAddresses))
  );
};

const isValidGetTransactionReceiptsParams = (
  args: any
): args is GetTransactionReceiptsParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    (args.blockHash !== undefined || args.blockNumber !== undefined) &&
    (args.blockHash === undefined || typeof args.blockHash === "string") &&
    (args.blockNumber === undefined ||
      typeof args.blockNumber === "string" ||
      typeof args.blockNumber === "number")
  );
};

const isValidGetTokenMetadataParams = (
  args: any
): args is GetTokenMetadataParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string"
  );
};

const isValidGetTokensForOwnerParams = (
  args: any
): args is GetTokensForOwnerParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.owner === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number") &&
    (args.contractAddresses === undefined ||
      Array.isArray(args.contractAddresses))
  );
};

const isValidGetNftsForContractParams = (
  args: any
): args is GetNftsForContractParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.contractAddress === "string" &&
    (args.pageKey === undefined || typeof args.pageKey === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number") &&
    (args.tokenUriTimeoutInMs === undefined ||
      typeof args.tokenUriTimeoutInMs === "number") &&
    (args.withMetadata === undefined || typeof args.withMetadata === "boolean")
  );
};

const isValidGetBlockWithTransactionsParams = (
  args: any
): args is GetBlockWithTransactionsParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    (args.blockNumber !== undefined || args.blockHash !== undefined) &&
    (args.blockNumber === undefined ||
      typeof args.blockNumber === "string" ||
      typeof args.blockNumber === "number") &&
    (args.blockHash === undefined || typeof args.blockHash === "string")
  );
};

const isValidGetTransactionParams = (
  args: any
): args is GetTransactionParams => {
  return (
    typeof args === "object" && args !== null && typeof args.hash === "string"
  );
};

const isValidResolveEnsParams = (args: any): args is ResolveEnsParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.name === "string" &&
    (args.blockTag === undefined ||
      typeof args.blockTag === "string" ||
      typeof args.blockTag === "number")
  );
};

const isValidLookupAddressParams = (args: any): args is LookupAddressParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.address === "string"
  );
};

const isValidEstimateGasPriceParams = (
  args: any
): args is EstimateGasPriceParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    (args.maxFeePerGas === undefined || typeof args.maxFeePerGas === "boolean")
  );
};

const isValidSubscribeParams = (args: any): args is SubscribeParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.type === "string" &&
    (args.address === undefined || typeof args.address === "string") &&
    (args.topics === undefined || Array.isArray(args.topics))
  );
};

const isValidUnsubscribeParams = (args: any): args is UnsubscribeParams => {
  return (
    typeof args === "object" &&
    args !== null &&
    typeof args.subscriptionId === "string"
  );
};

export class AlchemyMcpServer {
  private server: Server;
  private alchemy: Alchemy;
  private logger: Logger;
  private activeSubscriptions: Map<string, any>;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: "alchemy-sdk-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up tool handlers
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);

    // Handle process termination
    process.on("SIGINT", async () => {
      // Clean up any active subscriptions
      for (const [id, subscription] of activeSubscriptions.entries()) {
        try {
          subscription.unsubscribe();
          console.error(`[Cleanup] Unsubscribed from subscription ${id}`);
        } catch (error) {
          console.error(`[Cleanup] Failed to unsubscribe from ${id}:`, error);
        }
      }

      await this.server.close();
      process.exit(0);
    });

    this.alchemy = new Alchemy(settings);
    this.logger = new Logger("AlchemyMcpServer");
    this.activeSubscriptions = new Map();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // NFT API Tools
        {
          name: "get_nfts_for_owner",
          description: "Get NFTs owned by a specific wallet address",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "The wallet address to get NFTs for",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of NFTs to return in one page (max: 100)",
              },
              contractAddresses: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of contract addresses to filter by",
              },
              withMetadata: {
                type: "boolean",
                description: "Whether to include NFT metadata",
              },
            },
            required: ["owner"],
          },
        },
        {
          name: "get_nft_metadata",
          description: "Get metadata for a specific NFT",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT",
              },
              tokenId: {
                type: "string",
                description: "The token ID of the NFT",
              },
              tokenType: {
                type: "string",
                description: "The token type (ERC721 or ERC1155)",
              },
              refreshCache: {
                type: "boolean",
                description: "Whether to refresh the cache",
              },
            },
            required: ["contractAddress", "tokenId"],
          },
        },
        {
          name: "get_nft_sales",
          description: "Get NFT sales data for a contract or specific NFT",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT collection",
              },
              tokenId: {
                type: "string",
                description: "The token ID of the specific NFT",
              },
              fromBlock: {
                type: "number",
                description: "Starting block number for the query",
              },
              toBlock: {
                type: "number",
                description: "Ending block number for the query",
              },
              order: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Order of results (ascending or descending)",
              },
              marketplace: {
                type: "string",
                description:
                  "Filter by marketplace (e.g., 'seaport', 'wyvern')",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of results per page",
              },
            },
          },
        },
        {
          name: "get_contracts_for_owner",
          description: "Get NFT contracts owned by an address",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "The wallet address to get contracts for",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of results per page",
              },
              includeFilters: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["spam", "airdrops"],
                },
                description: "Filters to include in the response",
              },
              excludeFilters: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["spam", "airdrops"],
                },
                description: "Filters to exclude from the response",
              },
            },
            required: ["owner"],
          },
        },
        {
          name: "get_floor_price",
          description: "Get floor price for an NFT collection",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT collection",
              },
            },
            required: ["contractAddress"],
          },
        },
        {
          name: "get_owners_for_nft",
          description: "Get owners of a specific NFT",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT",
              },
              tokenId: {
                type: "string",
                description: "The token ID of the NFT",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of results per page",
              },
            },
            required: ["contractAddress", "tokenId"],
          },
        },
        {
          name: "get_nfts_for_contract",
          description: "Get all NFTs for a contract",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT collection",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of results per page",
              },
              tokenUriTimeoutInMs: {
                type: "number",
                description: "Timeout for token URI resolution in milliseconds",
              },
              withMetadata: {
                type: "boolean",
                description: "Whether to include metadata",
              },
            },
            required: ["contractAddress"],
          },
        },
        {
          name: "get_transfers_for_contract",
          description: "Get transfers for an NFT contract",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the NFT collection",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              fromBlock: {
                type: "number",
                description: "Starting block number for the query",
              },
              toBlock: {
                type: "number",
                description: "Ending block number for the query",
              },
              order: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Order of results (ascending or descending)",
              },
              tokenType: {
                type: "string",
                enum: ["ERC721", "ERC1155"],
                description: "Type of token (ERC721 or ERC1155)",
              },
            },
            required: ["contractAddress"],
          },
        },
        {
          name: "get_transfers_for_owner",
          description: "Get NFT transfers for an owner",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "The wallet address to get transfers for",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              fromBlock: {
                type: "number",
                description: "Starting block number for the query",
              },
              toBlock: {
                type: "number",
                description: "Ending block number for the query",
              },
              order: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Order of results (ascending or descending)",
              },
              tokenType: {
                type: "string",
                enum: ["ERC721", "ERC1155"],
                description: "Type of token (ERC721 or ERC1155)",
              },
              contractAddresses: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of contract addresses to filter by",
              },
            },
            required: ["owner"],
          },
        },

        // Core API Tools
        {
          name: "get_token_balances",
          description: "Get token balances for a specific address",
          inputSchema: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "The wallet address to get token balances for",
              },
              tokenAddresses: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of token addresses to filter by",
              },
            },
            required: ["address"],
          },
        },
        {
          name: "get_token_metadata",
          description: "Get metadata for a token contract",
          inputSchema: {
            type: "object",
            properties: {
              contractAddress: {
                type: "string",
                description: "The contract address of the token",
              },
            },
            required: ["contractAddress"],
          },
        },
        {
          name: "get_tokens_for_owner",
          description: "Get tokens owned by an address",
          inputSchema: {
            type: "object",
            properties: {
              owner: {
                type: "string",
                description: "The wallet address to get tokens for",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              pageSize: {
                type: "number",
                description: "Number of results per page",
              },
              contractAddresses: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of contract addresses to filter by",
              },
            },
            required: ["owner"],
          },
        },
        {
          name: "get_asset_transfers",
          description: "Get asset transfers for a specific address or contract",
          inputSchema: {
            type: "object",
            properties: {
              fromBlock: {
                type: "string",
                description: 'The starting block (hex string or "latest")',
              },
              toBlock: {
                type: "string",
                description: 'The ending block (hex string or "latest")',
              },
              fromAddress: {
                type: "string",
                description: "The sender address",
              },
              toAddress: {
                type: "string",
                description: "The recipient address",
              },
              category: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "external",
                    "internal",
                    "erc20",
                    "erc721",
                    "erc1155",
                    "specialnft",
                  ],
                },
                description:
                  'The category of transfers to include (e.g., "external", "internal", "erc20", "erc721", "erc1155", "specialnft")',
              },
              contractAddresses: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of contract addresses to filter by",
              },
              maxCount: {
                type: "number",
                description: "The maximum number of results to return",
              },
              excludeZeroValue: {
                type: "boolean",
                description: "Whether to exclude zero value transfers",
              },
              pageKey: {
                type: "string",
                description: "Key for pagination",
              },
              withMetadata: {
                type: "boolean",
                description: "Whether to include metadata in the response",
              },
            },
          },
        },
        {
          name: "get_transaction_receipts",
          description: "Get transaction receipts for a block",
          inputSchema: {
            type: "object",
            properties: {
              blockHash: {
                type: "string",
                description: "The hash of the block",
              },
              blockNumber: {
                type: "string",
                description: "The number of the block",
              },
            },
            oneOf: [{ required: ["blockHash"] }, { required: ["blockNumber"] }],
          },
        },
        {
          name: "get_block_number",
          description: "Get the latest block number",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_block_with_transactions",
          description: "Get a block with its transactions",
          inputSchema: {
            type: "object",
            properties: {
              blockNumber: {
                type: "string",
                description: "The block number",
              },
              blockHash: {
                type: "string",
                description: "The block hash",
              },
            },
            oneOf: [{ required: ["blockNumber"] }, { required: ["blockHash"] }],
          },
        },
        {
          name: "get_transaction",
          description: "Get transaction details by hash",
          inputSchema: {
            type: "object",
            properties: {
              hash: {
                type: "string",
                description: "The transaction hash",
              },
            },
            required: ["hash"],
          },
        },
        {
          name: "resolve_ens",
          description: "Resolve an ENS name to an address",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The ENS name to resolve",
              },
              blockTag: {
                type: "string",
                description: "The block tag to use for resolution",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "lookup_address",
          description: "Lookup the ENS name for an address",
          inputSchema: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "The address to lookup",
              },
            },
            required: ["address"],
          },
        },
        {
          name: "estimate_gas_price",
          description: "Estimate current gas price",
          inputSchema: {
            type: "object",
            properties: {
              maxFeePerGas: {
                type: "boolean",
                description:
                  "Whether to include maxFeePerGas and maxPriorityFeePerGas",
              },
            },
          },
        },

        // WebSocket Subscription Tools
        {
          name: "subscribe",
          description: "Subscribe to blockchain events",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["newHeads", "logs", "pendingTransactions", "mined"],
                description: "The type of subscription",
              },
              address: {
                type: "string",
                description: "The address to filter by (for logs)",
              },
              topics: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "The topics to filter by (for logs)",
              },
            },
            required: ["type"],
          },
        },
        {
          name: "unsubscribe",
          description: "Unsubscribe from blockchain events",
          inputSchema: {
            type: "object",
            properties: {
              subscriptionId: {
                type: "string",
                description: "The ID of the subscription to cancel",
              },
            },
            required: ["subscriptionId"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra): Promise<ServerResult> => {
        try {
          if (!request.params.arguments) {
            throw new MicrosoftMcpError(
              ErrorCode.InvalidParams,
              "Missing arguments"
            );
          }

          let result: unknown;
          switch (request.params.name) {
            // NFT API handlers
            case "get_nfts_for_owner":
              result = await this.handleGetNftsForOwner(
                request.params.arguments
              );
              break;
            case "get_nft_metadata":
              result = await this.handleGetNftMetadata(
                request.params.arguments
              );
              break;
            case "get_nft_sales":
              result = await this.handleGetNftSales(request.params.arguments);
              break;
            case "get_contracts_for_owner":
              result = await this.handleGetContractsForOwner(
                request.params.arguments
              );
              break;
            case "get_floor_price":
              result = await this.handleGetFloorPrice(request.params.arguments);
              break;
            case "get_owners_for_nft":
              result = await this.handleGetOwnersForNft(
                request.params.arguments
              );
              break;
            case "get_transfers_for_contract":
              result = await this.handleGetTransfersForContract(
                request.params.arguments
              );
              break;
            case "get_transfers_for_owner":
              result = await this.handleGetTransfersForOwner(
                request.params.arguments
              );
              break;
            case "get_transaction_receipts":
              result = await this.handleGetTransactionReceipts(
                request.params.arguments
              );
              break;
            case "get_token_metadata":
              result = await this.handleGetTokenMetadata(
                request.params.arguments
              );
              break;
            case "get_tokens_for_owner":
              result = await this.handleGetTokensForOwner(
                request.params.arguments
              );
              break;
            case "get_nfts_for_contract":
              result = await this.handleGetNftsForContract(
                request.params.arguments
              );
              break;
            case "get_block_with_transactions":
              result = await this.handleGetBlockWithTransactions(
                request.params.arguments
              );
              break;
            case "get_transaction":
              result = await this.handleGetTransaction(
                request.params.arguments
              );
              break;
            case "resolve_ens":
              result = await this.handleResolveEns(request.params.arguments);
              break;
            case "lookup_address":
              result = await this.handleLookupAddress(request.params.arguments);
              break;
            case "estimate_gas_price":
              result = await this.handleEstimateGasPrice(
                request.params.arguments
              );
              break;
            case "subscribe":
              result = await this.handleSubscribe(request.params.arguments);
              break;
            case "unsubscribe":
              result = await this.handleUnsubscribe(request.params.arguments);
              break;
            default:
              throw new MicrosoftMcpError(
                ErrorCode.InvalidParams,
                `Unknown tool: ${request.params.name}`
              );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result),
              },
            ],
          };
        } catch (error) {
          console.error("[Tool Error]", error);
          throw new MicrosoftMcpError(
            ErrorCode.InternalError,
            `Tool error: ${error.message}`
          );
        }
      }
    );
  }

  private validateAndCastParams<T>(
    args: Record<string, unknown>,
    validator: (args: Record<string, unknown>) => boolean,
    errorMessage: string
  ): T {
    if (!validator(args)) {
      throw new MicrosoftMcpError(ErrorCode.InvalidParams, errorMessage);
    }
    return args as unknown as T;
  }

  private async handleGetNftsForOwner(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetNftsForOwnerParams>(
      args,
      isValidGetNftsForOwnerParams,
      "Invalid NFTs for owner parameters"
    );
    this.logger.info("Getting NFTs for owner", { params });
    return await this.alchemy.nft.getNftsForOwner(params.owner, params);
  }

  private async handleGetNftMetadata(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetNftMetadataParams>(
      args,
      isValidGetNftMetadataParams,
      "Invalid NFT metadata parameters"
    );
    this.logger.info("Getting NFT metadata", { params });
    return await this.alchemy.nft.getNftMetadata(
      params.contractAddress,
      params.tokenId
    );
  }

  private async handleGetNftSales(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetNftSalesParams>(
      args,
      isValidGetNftSalesParams,
      "Invalid NFT sales parameters"
    );
    this.logger.info("Getting NFT sales", { params });
    return await this.alchemy.nft.getNftSales(params);
  }

  private async handleGetContractsForOwner(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetContractsForOwnerParams>(
      args,
      isValidGetContractsForOwnerParams,
      "Invalid contracts for owner parameters"
    );
    this.logger.info("Getting contracts for owner", { params });
    return await this.alchemy.nft.getContractsForOwner(params.owner);
  }

  private async handleGetFloorPrice(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetFloorPriceParams>(
      args,
      isValidGetFloorPriceParams,
      "Invalid floor price parameters"
    );
    this.logger.info("Getting floor price", { params });
    return await this.alchemy.nft.getFloorPrice(params.contractAddress);
  }

  private async handleGetOwnersForNft(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetOwnersForNftParams>(
      args,
      isValidGetOwnersForNftParams,
      "Invalid owners for NFT parameters"
    );
    this.logger.info("Getting owners for NFT", { params });
    return await this.alchemy.nft.getOwnersForNft(
      params.contractAddress,
      params.tokenId
    );
  }

  private async handleGetTransfersForContract(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetTransfersForContractParams>(
      args,
      isValidGetTransfersForContractParams,
      "Invalid transfers for contract parameters"
    );
    this.logger.info("Getting transfers for contract", { params });
    return await this.alchemy.nft.getTransfersForContract(
      params.contractAddress,
      params
    );
  }

  private async handleGetTransfersForOwner(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetTransfersForOwnerParams>(
      args,
      isValidGetTransfersForOwnerParams,
      "Invalid transfers for owner parameters"
    );
    this.logger.info("Getting transfers for owner", { params });
    return await this.alchemy.nft.getTransfersForOwner(params.owner);
  }

  private async handleGetTransactionReceipts(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<TransactionReceiptsParams>(
      args,
      isValidGetTransactionReceiptsParams,
      "Invalid transaction receipts parameters"
    );
    this.logger.info("Getting transaction receipts", { params });
    return await this.alchemy.core.getTransactionReceipts(params);
  }

  private async handleGetTokenMetadata(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetTokenMetadataParams>(
      args,
      isValidGetTokenMetadataParams,
      "Invalid token metadata parameters"
    );
    this.logger.info("Getting token metadata", { params });
    return await this.alchemy.core.getTokenMetadata(params.contractAddress);
  }

  private async handleGetTokensForOwner(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetTokensForOwnerParams>(
      args,
      isValidGetTokensForOwnerParams,
      "Invalid tokens for owner parameters"
    );
    this.logger.info("Getting tokens for owner", { params });
    return await this.alchemy.core.getTokensForOwner(params.owner);
  }

  private async handleGetNftsForContract(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetNftsForContractParams>(
      args,
      isValidGetNftsForContractParams,
      "Invalid NFTs for contract parameters"
    );
    this.logger.info("Getting NFTs for contract", { params });
    return await this.alchemy.nft.getNftsForContract(
      params.contractAddress,
      params
    );
  }

  private async handleGetBlockWithTransactions(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetBlockWithTransactionsParams>(
      args,
      isValidGetBlockWithTransactionsParams,
      "Invalid block with transactions parameters"
    );
    this.logger.info("Getting block with transactions", { params });
    const blockTag = params.blockNumber || params.blockHash || "latest";
    return await this.alchemy.core.getBlockWithTransactions(blockTag);
  }

  private async handleGetTransaction(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<GetTransactionParams>(
      args,
      isValidGetTransactionParams,
      "Invalid transaction parameters"
    );
    this.logger.info("Getting transaction", { params });
    return await this.alchemy.core.getTransaction(params.hash);
  }

  private async handleResolveEns(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<ResolveEnsParams>(
      args,
      isValidResolveEnsParams,
      "Invalid ENS parameters"
    );
    this.logger.info("Resolving ENS name", { params });
    return await this.alchemy.core.resolveName(params.name);
  }

  private async handleLookupAddress(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<LookupAddressParams>(
      args,
      isValidLookupAddressParams,
      "Invalid lookup address parameters"
    );
    this.logger.info("Looking up address", { params });
    return await this.alchemy.core.lookupAddress(params.address);
  }

  private async handleEstimateGasPrice(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<EstimateGasPriceParams>(
      args,
      isValidEstimateGasPriceParams,
      "Invalid gas price parameters"
    );
    this.logger.info("Estimating gas price", { params });
    return await this.alchemy.core.getGasPrice();
  }

  private async handleSubscribe(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<SubscribeParams>(
      args,
      isValidSubscribeParams,
      "Invalid subscribe parameters"
    );
    this.logger.info("Creating subscription", { params });

    const subscriptionId = Math.random().toString(36).substring(7);
    let subscription;

    switch (params.type) {
      case "newHeads":
        subscription = this.alchemy.ws.on("block", (blockNumber) => {
          this.logger.info("[WebSocket] New block:", blockNumber);
        });
        break;
      case "logs":
        subscription = this.alchemy.ws.on(
          {
            method: "alchemy_filteredNewFullPendingTransactions",
            addresses: params.address ? [params.address] : undefined,
            topics: params.topics,
          },
          (log) => {
            this.logger.info("[WebSocket] New log:", log);
          }
        );
        break;
      case "pendingTransactions":
        subscription = this.alchemy.ws.on("pending", (tx) => {
          this.logger.info("[WebSocket] Pending transaction:", tx);
        });
        break;
      default:
        throw new MicrosoftMcpError(
          ErrorCode.InvalidParams,
          `Unknown subscription type: ${params.type}`
        );
    }

    this.activeSubscriptions.set(subscriptionId, subscription);
    return { subscriptionId };
  }

  private async handleUnsubscribe(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const params = this.validateAndCastParams<UnsubscribeParams>(
      args,
      isValidUnsubscribeParams,
      "Invalid unsubscribe parameters"
    );
    this.logger.info("Removing subscription", { params });

    const subscription = this.activeSubscriptions.get(params.subscriptionId);
    if (!subscription) {
      throw new MicrosoftMcpError(
        ErrorCode.InvalidParams,
        `Subscription not found: ${params.subscriptionId}`
      );
    }

    subscription.unsubscribe();
    this.activeSubscriptions.delete(params.subscriptionId);
    return { success: true };
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.server.listen(transport);
    console.error("[Setup] Alchemy MCP server started");
  }
}

// Start the server
const server = new AlchemyMcpServer();
server.start().catch((error) => {
  console.error("[Fatal Error]", error);
  process.exit(1);
});
