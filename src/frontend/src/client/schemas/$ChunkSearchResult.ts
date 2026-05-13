/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ChunkSearchResult = {
    description: `Individual chunk search result.`,
    properties: {
        chunk: {
            type: 'EpigraphChunkOut',
            isRequired: true,
        },
        similarity_score: {
            type: 'number',
            isRequired: true,
        },
        epigraph_id: {
            type: 'number',
            isRequired: true,
        },
        epigraph_title: {
            type: 'string',
            isRequired: true,
        },
        epigraph_period: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
