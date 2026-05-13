/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for chunk statistics.
 */
export type ChunkStatisticsResponse = {
    total_epigraphs: number;
    epigraphs_chunked: number;
    epigraphs_not_chunked: number;
    total_chunks: number;
    chunks_with_embeddings: number;
    chunks_without_embeddings: number;
    average_chunks_per_epigraph: number;
    average_tokens_per_chunk: number;
    chunk_types: Record<string, number>;
    estimated_cost?: (Record<string, any> | null);
};

