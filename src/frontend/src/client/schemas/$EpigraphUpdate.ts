/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphUpdate = {
    properties: {
        dasi_object: {
            type: 'any-of',
            contains: [{
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            }, {
                type: 'null',
            }],
        },
        dasi_id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        title: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        uri: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        epigraph_text: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
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
            type: 'any-of',
            contains: [{
                type: 'boolean',
            }, {
                type: 'null',
            }],
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
            type: 'array',
            contains: {
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            },
        },
        language_level_1: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
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
            type: 'any-of',
            contains: [{
                type: 'boolean',
            }, {
                type: 'null',
            }],
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
            type: 'any-of',
            contains: [{
                type: 'boolean',
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
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
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
