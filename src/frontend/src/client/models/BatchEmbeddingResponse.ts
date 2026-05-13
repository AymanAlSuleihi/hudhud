/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for batch embedding operations.
 */
export type BatchEmbeddingResponse = {
    status: string;
    batch_id?: (string | null);
    chunk_count: number;
    message: string;
    estimated_cost?: (Record<string, any> | null);
};

