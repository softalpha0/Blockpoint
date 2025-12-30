
import LOCK_VAULT_ABI_JSON from "./abi/LockVault.abi.json";
import SAVINGS_VAULT_ABI_JSON from "./abi/SavingsVault.abi.json";
export const ERC20_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

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
  { type: "function", name: "feeBps", inputs: [], outputs: [{ type: "uint16", internalType: "uint16" }], stateMutability: "view" },
  { type: "function", name: "feeCollector", inputs: [], outputs: [{ type: "address", internalType: "address" }], stateMutability: "view" },
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

export const LOCK_VAULT_ABI = (LOCK_VAULT_ABI_JSON as unknown) as readonly any[];
export const SAVINGS_VAULT_ABI = (SAVINGS_VAULT_ABI_JSON as unknown) as readonly any[];

export const erc20Abi = ERC20_ABI;
export const invoiceRouterAbi = INVOICE_ROUTER_ABI;
export const lockVaultAbi = LOCK_VAULT_ABI;
export const savingsVaultAbi = SAVINGS_VAULT_ABI;
