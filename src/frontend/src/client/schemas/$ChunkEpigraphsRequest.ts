/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ChunkEpigraphsRequest = {
    description: `Request model for chunking epigraphs.`,
    properties: {
        epigraph_ids: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'number',
                },
            }, {
                type: 'null',
            }],
        },
        limit: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        rechunk: {
            type: 'boolean',
        },
        generate_embeddings: {
            type: 'boolean',
        },
    },
} as const;
