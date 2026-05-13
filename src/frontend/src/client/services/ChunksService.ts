/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BatchEmbeddingRequest } from '../models/BatchEmbeddingRequest';
import type { BatchEmbeddingResponse } from '../models/BatchEmbeddingResponse';
import type { BatchStatusResponse } from '../models/BatchStatusResponse';
import type { ChunkEpigraphsRequest } from '../models/ChunkEpigraphsRequest';
import type { ChunkEpigraphsResponse } from '../models/ChunkEpigraphsResponse';
import type { ChunkStatisticsResponse } from '../models/ChunkStatisticsResponse';
import type { EpigraphChunkCreate } from '../models/EpigraphChunkCreate';
import type { EpigraphChunkOut } from '../models/EpigraphChunkOut';
import type { EpigraphChunksOut } from '../models/EpigraphChunksOut';
import type { EpigraphChunkUpdate } from '../models/EpigraphChunkUpdate';
import type { MultiBatchRequest } from '../models/MultiBatchRequest';
import type { MultiBatchResponse } from '../models/MultiBatchResponse';
import type { MultiBatchStatusResponse } from '../models/MultiBatchStatusResponse';
import type { SemanticSearchRequest } from '../models/SemanticSearchRequest';
import type { SemanticSearchResponse } from '../models/SemanticSearchResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChunksService {
    /**
     * Read Chunks
     * Retrieve chunks with pagination.
     * @returns EpigraphChunksOut Successful Response
     * @throws ApiError
     */
    public static chunksReadChunks({
        skip,
        limit = 100,
    }: {
        /**
         * Number of records to skip before returning results
         */
        skip?: number,
        /**
         * Maximum number of records to return
         */
        limit?: number,
    }): CancelablePromise<EpigraphChunksOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Chunk Statistics
     * Get comprehensive statistics about epigraph chunks, embeddings, and estimated costs.
     * @returns ChunkStatisticsResponse Successful Response
     * @throws ApiError
     */
    public static chunksGetChunkStatistics(): CancelablePromise<ChunkStatisticsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/statistics',
        });
    }
    /**
     * Read Chunk
     * Retrieve a single chunk by ID.
     * @returns EpigraphChunkOut Successful Response
     * @throws ApiError
     */
    public static chunksReadChunk({
        chunkId,
    }: {
        /**
         * Internal resource identifier
         */
        chunkId: number,
    }): CancelablePromise<EpigraphChunkOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/{chunk_id}',
            path: {
                'chunk_id': chunkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Chunk
     * Update an existing chunk.
     * @returns EpigraphChunkOut Successful Response
     * @throws ApiError
     */
    public static chunksUpdateChunk({
        chunkId,
        requestBody,
    }: {
        /**
         * Internal resource identifier
         */
        chunkId: number,
        requestBody: EpigraphChunkUpdate,
    }): CancelablePromise<EpigraphChunkOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/chunks/{chunk_id}',
            path: {
                'chunk_id': chunkId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Chunk
     * Delete a chunk by ID.
     * @returns EpigraphChunkOut Successful Response
     * @throws ApiError
     */
    public static chunksDeleteChunk({
        chunkId,
    }: {
        /**
         * Internal resource identifier
         */
        chunkId: number,
    }): CancelablePromise<EpigraphChunkOut> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chunks/{chunk_id}',
            path: {
                'chunk_id': chunkId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Chunks By Epigraph
     * Retrieve all chunks for a specific epigraph.
     * @returns EpigraphChunksOut Successful Response
     * @throws ApiError
     */
    public static chunksReadChunksByEpigraph({
        epigraphId,
        skip,
        limit = 100,
    }: {
        /**
         * Internal resource identifier
         */
        epigraphId: number,
        /**
         * Number of records to skip before returning results
         */
        skip?: number,
        /**
         * Maximum number of records to return
         */
        limit?: number,
    }): CancelablePromise<EpigraphChunksOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/epigraph/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Chunks By Epigraph
     * Delete all chunks for a specific epigraph.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksDeleteChunksByEpigraph({
        epigraphId,
    }: {
        /**
         * Internal resource identifier
         */
        epigraphId: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/chunks/epigraph/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Chunks By Type
     * Retrieve chunks by type (e.g., translation, cultural_notes).
     * @returns EpigraphChunksOut Successful Response
     * @throws ApiError
     */
    public static chunksReadChunksByType({
        chunkType,
        skip,
        limit = 100,
    }: {
        /**
         * Chunk type
         */
        chunkType: string,
        /**
         * Number of records to skip before returning results
         */
        skip?: number,
        /**
         * Maximum number of records to return
         */
        limit?: number,
    }): CancelablePromise<EpigraphChunksOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/type/{chunk_type}',
            path: {
                'chunk_type': chunkType,
            },
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Chunk
     * Create a new chunk.
     * @returns EpigraphChunkOut Successful Response
     * @throws ApiError
     */
    public static chunksCreateChunk({
        requestBody,
    }: {
        requestBody: EpigraphChunkCreate,
    }): CancelablePromise<EpigraphChunkOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Chunk Epigraphs
     * Chunk epigraphs into smaller pieces for RAG with optional immediate embeddings.
     * @returns ChunkEpigraphsResponse Successful Response
     * @throws ApiError
     */
    public static chunksChunkEpigraphs({
        requestBody,
    }: {
        requestBody: ChunkEpigraphsRequest,
    }): CancelablePromise<ChunkEpigraphsResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/process',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Batch Embedding Job
     * Create a batch embedding job for chunks using OpenAI's Batch API (50% cost savings).
     * @returns BatchEmbeddingResponse Successful Response
     * @throws ApiError
     */
    public static chunksCreateBatchEmbeddingJob({
        requestBody,
    }: {
        requestBody: BatchEmbeddingRequest,
    }): CancelablePromise<BatchEmbeddingResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/embeddings/batch/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Batch Embedding Status
     * Check the status of a batch embedding job.
     * @returns BatchStatusResponse Successful Response
     * @throws ApiError
     */
    public static chunksGetBatchEmbeddingStatus({
        batchId,
    }: {
        /**
         * OpenAI batch identifier
         */
        batchId: string,
    }): CancelablePromise<BatchStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/embeddings/batch/status/{batch_id}',
            path: {
                'batch_id': batchId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Apply Batch Embedding Results
     * Apply results from a completed batch embedding job to chunks.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksApplyBatchEmbeddingResults({
        batchId,
    }: {
        /**
         * OpenAI batch identifier
         */
        batchId: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/embeddings/batch/apply/{batch_id}',
            path: {
                'batch_id': batchId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Batch Jobs
     * List recent batch embedding jobs from OpenAI's batch API.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksListBatchJobs({
        limit = 20,
    }: {
        /**
         * Maximum number of batch jobs to return
         */
        limit?: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/embeddings/batch/list',
            query: {
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Multiple Batch Jobs
     * Create multiple batch embedding jobs for large-scale processing (auto-splits into batches of up to 50k chunks).
     * @returns MultiBatchResponse Successful Response
     * @throws ApiError
     */
    public static chunksCreateMultipleBatchJobs({
        requestBody,
    }: {
        requestBody: MultiBatchRequest,
    }): CancelablePromise<MultiBatchResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/embeddings/batch/create-multiple',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Multiple Batch Status
     * Check status of multiple batch jobs with summary counts and completion estimates.
     * @returns MultiBatchStatusResponse Successful Response
     * @throws ApiError
     */
    public static chunksGetMultipleBatchStatus({
        requestBody,
    }: {
        requestBody: Array<string>,
    }): CancelablePromise<MultiBatchStatusResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/embeddings/batch/status-multiple',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Apply Multiple Batch Results
     * Apply results from multiple completed batch jobs (skips incomplete batches).
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksApplyMultipleBatchResults({
        requestBody,
    }: {
        requestBody: Array<string>,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/embeddings/batch/apply-multiple',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Batch Tracking Info
     * Get tracking information for all batch jobs created via create-multiple endpoint.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksGetBatchTrackingInfo(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chunks/embeddings/batch/tracking',
        });
    }
    /**
     * Semantic Search Chunks
     * Semantic search across epigraph chunks using embeddings with optional filtering by type, period, and language.
     * @returns SemanticSearchResponse Successful Response
     * @throws ApiError
     */
    public static chunksSemanticSearchChunks({
        requestBody,
    }: {
        requestBody: SemanticSearchRequest,
    }): CancelablePromise<SemanticSearchResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/search',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Semantic Search With Context
     * Semantic search with surrounding context chunks grouped by epigraph for enhanced RAG context.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static chunksSemanticSearchWithContext({
        requestBody,
    }: {
        requestBody: SemanticSearchRequest,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chunks/search/with-context',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
