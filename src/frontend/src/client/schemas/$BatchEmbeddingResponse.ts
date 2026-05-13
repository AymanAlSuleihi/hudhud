/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BatchEmbeddingResponse = {
    description: `Response model for batch embedding operations.`,
    properties: {
        status: {
            type: 'string',
            isRequired: true,
        },
        batch_id: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        chunk_count: {
            type: 'number',
            isRequired: true,
        },
        message: {
            type: 'string',
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
