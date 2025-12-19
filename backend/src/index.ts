// backend/src/index.ts
import "dotenv/config";
import { startApi } from "./api.js";
import { startIndexer } from "./indexer.js";

startApi();
startIndexer();