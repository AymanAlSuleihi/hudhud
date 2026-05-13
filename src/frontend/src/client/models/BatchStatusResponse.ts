/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response model for batch job status.
 */
export type BatchStatusResponse = {
    id: string;
    status: string;
    created_at: number;
    completed_at?: (number | null);
    failed_at?: (number | null);
    request_counts: Record<string, number>;
    output_file_id?: (string | null);
    error_file_id?: (string | null);
};

