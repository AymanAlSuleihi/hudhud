/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request model for semantic search.
 */
export type SemanticSearchRequest = {
    query: string;
    limit?: number;
    distance_threshold?: (number | null);
    chunk_types?: (Array<string> | null);
    periods?: (Array<string> | null);
    languages?: (Array<string> | null);
};

