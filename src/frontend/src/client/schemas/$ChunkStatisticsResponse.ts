/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ChunkStatisticsResponse = {
    description: `Response model for chunk statistics.`,
    properties: {
        total_epigraphs: {
            type: 'number',
            isRequired: true,
        },
        epigraphs_chunked: {
            type: 'number',
            isRequired: true,
        },
        epigraphs_not_chunked: {
            type: 'number',
            isRequired: true,
        },
        total_chunks: {
            type: 'number',
            isRequired: true,
        },
        chunks_with_embeddings: {
            type: 'number',
            isRequired: true,
        },
        chunks_without_embeddings: {
            type: 'number',
            isRequired: true,
        },
        average_chunks_per_epigraph: {
            type: 'number',
            isRequired: true,
        },
        average_tokens_per_chunk: {
            type: 'number',
            isRequired: true,
        },
        chunk_types: {
            type: 'dictionary',
            contains: {
                type: 'number',
            },
            isRequired: true,
        },
        estimated_cost: {
            type: 'any-of',
            contains: [{
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            }, {
                type: 'null',
            }],
        },
    },
} as const;
