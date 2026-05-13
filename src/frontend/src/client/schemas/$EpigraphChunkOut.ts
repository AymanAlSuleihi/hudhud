/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphChunkOut = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        epigraph_id: {
            type: 'number',
            isRequired: true,
        },
        chunk_text: {
            type: 'string',
            isRequired: true,
        },
        chunk_type: {
            type: 'string',
            isRequired: true,
        },
        chunk_index: {
            type: 'number',
            isRequired: true,
        },
        chunk_metadata: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
        token_count: {
            type: 'number',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updated_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
