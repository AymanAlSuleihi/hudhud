/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ObjectCreate = {
    properties: {
        dasi_object: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        dasi_id: {
            type: 'number',
            isRequired: true,
        },
        title: {
            type: 'string',
            isRequired: true,
        },
        uri: {
            type: 'string',
            isRequired: true,
        },
        start_date: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        end_date: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        period: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        deposits: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        materials: {
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
        shape: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        measures: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        decorations: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        support_type_level_1: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        support_type_level_2: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        support_type_level_3: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        support_type_level_4: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        support_notes: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        deposit_notes: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        cultural_notes: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        bibliography: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        concordances: {
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
        license: {
            type: 'string',
            isRequired: true,
        },
        editors: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        first_published: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        last_modified: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date-time',
            }, {
                type: 'null',
            }],
        },
        dasi_published: {
            type: 'any-of',
            contains: [{
                type: 'boolean',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
