/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for chunking operations.
 */
export type ChunkEpigraphsResponse = {
    status: string;
    processed: number;
    chunks_created: number;
    failed: number;
    failed_ids?: Array<number>;
    elapsed_seconds: number;
    message: string;
};

