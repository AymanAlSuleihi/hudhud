/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SemanticSearchResponse = {
    description: `Response model for semantic search.`,
    properties: {
        query: {
            type: 'string',
            isRequired: true,
        },
        results: {
            type: 'array',
            contains: {
                type: 'ChunkSearchResult',
            },
            isRequired: true,
        },
        total_results: {
            type: 'number',
            isRequired: true,
        },
        message: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
