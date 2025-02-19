/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphCreate = {
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
        epigraph_text: {
            type: 'string',
            isRequired: true,
        },
        translations: {
            type: 'any-of',
            contains: [{
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
        chronology_conjectural: {
            type: 'boolean',
            isRequired: true,
        },
        mentioned_date: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        sites: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        language_level_1: {
            type: 'string',
            isRequired: true,
        },
        language_level_2: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        language_level_3: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        alphabet: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        script_typology: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        script_cursus: {
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
        textual_typology: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        textual_typology_conjectural: {
            type: 'boolean',
            isRequired: true,
        },
        letter_measure: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        writing_techniques: {
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
        royal_inscription: {
            type: 'boolean',
            isRequired: true,
        },
        cultural_notes: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        aparatus_notes: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        general_notes: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
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
        first_published: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        editors: {
            type: 'any-of',
            contains: [{
                type: 'null',
            }],
        },
        last_modified_dasi: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date-time',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
