/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ChunkEpigraphsResponse = {
    description: `Response model for chunking operations.`,
    properties: {
        status: {
            type: 'string',
            isRequired: true,
        },
        processed: {
            type: 'number',
            isRequired: true,
        },
        chunks_created: {
            type: 'number',
            isRequired: true,
        },
        failed: {
            type: 'number',
            isRequired: true,
        },
        failed_ids: {
            type: 'array',
            contains: {
                type: 'number',
            },
        },
        elapsed_seconds: {
            type: 'number',
            isRequired: true,
        },
        message: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
