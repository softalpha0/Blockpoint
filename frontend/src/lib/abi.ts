/**
 * ABIs used across the app.
 *
 * Important: some parts of the codebase import camelCase names (erc20Abi, invoiceRouterAbi, etc).
 * We also export UPPER_SNAKE_CASE constants for clarity.
 *
 * This file intentionally exports both, to prevent build failures during refactors.
 */

// ---- Minimal ERC20 ABI (approve/allowance/balance/decimals/symbol) ----
export const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ---- Invoice Router ABI (from your pasted ABI) ----
export const INVOICE_ROUTER_ABI = [
  {
    type: "function",
    name: "createInvoice",
    inputs: [
      { name: "invoiceId", type: "bytes32", internalType: "bytes32" },
      { name: "merchantId", type: "bytes32", internalType: "bytes32" },
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "expiry", type: "uint64", internalType: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "payInvoice",
    inputs: [{ name: "invoiceId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "invoices",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "merchantId", type: "bytes32", internalType: "bytes32" },
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "expiry", type: "uint64", internalType: "uint64" },
      { name: "paid", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "InvoiceCreated",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "merchantId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InvoicePaid",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "payer", type: "address", indexed: false, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "fee", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

/**
 * Optional: Savings/Lock vault ABIs
 * If your contracts differ, replace these with your real ABIs.
 * For now we export minimal event shapes so /api/activity can decode logs without breaking builds.
 */

// Minimal placeholder SavingsVault ABI (replace with real one if needed)
export const SAVINGS_VAULT_ABI = [
  // Example events (safe placeholders)
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

// Minimal placeholder LockVault ABI (replace with real one if needed)
export const LOCK_VAULT_ABI = [
  {
    type: "event",
    name: "Locked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "reward", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unlocked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

// ---- Backwards-compatible camelCase exports ----
export const erc20Abi = ERC20_ABI;
export const invoiceRouterAbi = INVOICE_ROUTER_ABI;
export const savingsVaultAbi = SAVINGS_VAULT_ABI;
export const lockVaultAbi = LOCK_VAULT_ABI;
