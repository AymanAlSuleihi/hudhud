/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request model for creating multiple batch jobs.
 */
export type MultiBatchRequest = {
    chunk_ids?: (Array<number> | null);
    chunks_per_batch?: number;
    max_batches?: (number | null);
};

