/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChunkSearchResult } from './ChunkSearchResult';
/**
 * Response model for semantic search.
 */
export type SemanticSearchResponse = {
    query: string;
    results: Array<ChunkSearchResult>;
    total_results: number;
    message: string;
};

