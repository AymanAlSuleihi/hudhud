/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphChunkCreate = {
    properties: {
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
            description: `Type of chunk: translation, cultural_notes, apparatus_notes, general_notes, object_description, named_entities`,
            isRequired: true,
        },
        chunk_index: {
            type: 'number',
            description: `Position/order of this chunk within the epigraph`,
        },
        chunk_metadata: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        token_count: {
            type: 'number',
            description: `Number of tokens in chunk_text for budget management`,
        },
        embedding: {
            type: 'any-of',
            description: `Vector embedding of chunk_text`,
            contains: [{
                type: 'array',
                contains: {
                    type: 'number',
                },
            }, {
                type: 'null',
            }],
        },
    },
} as const;
