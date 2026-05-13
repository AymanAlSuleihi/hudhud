/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BatchEmbeddingRequest = {
    description: `Request model for creating batch embedding jobs.`,
    properties: {
        chunk_ids: {
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
        use_batch_api: {
            type: 'boolean',
        },
    },
} as const;
