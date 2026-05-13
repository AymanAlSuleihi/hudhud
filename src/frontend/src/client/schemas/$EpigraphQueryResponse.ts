/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphQueryResponse = {
    properties: {
        results: {
            type: 'EpigraphsOut',
            isRequired: true,
        },
        facets: {
            type: 'dictionary',
            contains: {
                type: 'array',
                contains: {
                    type: 'any-of',
                    contains: [{
                        type: 'string',
                    }, {
                        type: 'boolean',
                    }, {
                        type: 'number',
                    }, {
                        type: 'number',
                    }, {
                        type: 'array',
                        contains: {
                            type: 'string',
                        },
                    }],
                },
            },
            isRequired: true,
        },
        facet_counts: {
            type: 'dictionary',
            contains: {
                type: 'array',
                contains: {
                    type: 'EpigraphFacetBucket',
                },
            },
            isRequired: true,
        },
        facet_schema: {
            type: 'array',
            contains: {
                type: 'EpigraphFacetSchemaFieldResponse',
            },
            isRequired: true,
        },
        page: {
            type: 'number',
            isRequired: true,
        },
        page_size: {
            type: 'number',
            isRequired: true,
        },
        sort_field: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        sort_order: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
