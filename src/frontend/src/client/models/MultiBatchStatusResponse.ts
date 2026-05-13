/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for multi-batch status check.
 */
export type MultiBatchStatusResponse = {
    batch_ids: Array<string>;
    statuses: Array<Record<string, any>>;
    summary: Record<string, number>;
    all_completed: boolean;
    estimated_completion_time?: (string | null);
};

