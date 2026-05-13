/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request model for chunking epigraphs.
 */
export type ChunkEpigraphsRequest = {
    epigraph_ids?: (Array<number> | null);
    limit?: (number | null);
    rechunk?: boolean;
    generate_embeddings?: boolean;
};

