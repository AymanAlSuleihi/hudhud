/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SiteMinimal = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        dasi_id: {
            type: 'number',
            isRequired: true,
        },
        modern_name: {
            type: 'string',
            isRequired: true,
        },
        ancient_name: {
            type: 'string',
            isRequired: true,
        },
        country: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        governorate: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        geographical_area: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        coordinates: {
            type: 'any-of',
            contains: [{
                type: 'any[]',
                maxItems: 2,
                minItems: 2,
            }, {
                type: 'null',
            }],
        },
        coordinates_accuracy: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        type_of_site: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        deities: {
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
        tribe: {
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
        identification: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        kingdom: {
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
        language: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
