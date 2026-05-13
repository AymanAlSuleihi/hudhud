/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphQueryRequest = {
    properties: {
        search_text: {
            type: 'string',
        },
        fields: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        scope_keys: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'string',
                },
            }, {
                type: 'null',
            }],
        },
        include_objects: {
            type: 'boolean',
        },
        object_fields: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        filters: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        page: {
            type: 'number',
            minimum: 1,
        },
        page_size: {
            type: 'number',
            maximum: 250,
            minimum: 1,
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
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
