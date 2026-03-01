/**
 * API Route Handlers
 *
 * Implements OpenAI-compatible endpoints for Clawdbot integration
 */
import type { Request, Response } from "express";
/** Expose queue stats for /health */
export declare function getQueueStats(): {
    active: number;
    queued: number;
    max: number;
};
/**
 * Handle POST /v1/chat/completions
 *
 * Main endpoint for chat requests, supports both streaming and non-streaming
 */
export declare function handleChatCompletions(req: Request, res: Response): Promise<void>;
/**
 * Handle GET /v1/models
 *
 * Returns available models
 */
export declare function handleModels(_req: Request, res: Response): void;
/**
 * Handle GET /health
 *
 * Health check endpoint
 */
export declare function handleHealth(_req: Request, res: Response): void;
//# sourceMappingURL=routes.d.ts.map