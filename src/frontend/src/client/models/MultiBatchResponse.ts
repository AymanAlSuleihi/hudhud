/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for multi-batch operations.
 */
export type MultiBatchResponse = {
    status: string;
    total_chunks: number;
    num_batches: number;
    batch_ids: Array<string>;
    estimated_cost: Record<string, any>;
    message: string;
};

