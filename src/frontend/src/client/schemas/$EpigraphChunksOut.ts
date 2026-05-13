/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphChunksOut = {
    description: `Response model for list of chunks.`,
    properties: {
        chunks: {
            type: 'array',
            contains: {
                type: 'EpigraphChunkOut',
            },
            isRequired: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
