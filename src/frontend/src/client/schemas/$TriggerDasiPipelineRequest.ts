/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TriggerDasiPipelineRequest = {
    properties: {
        import_sites: {
            type: 'boolean',
        },
        import_objects: {
            type: 'boolean',
        },
        import_epigraphs: {
            type: 'boolean',
        },
        incremental: {
            type: 'boolean',
        },
        start_id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        end_id: {
            type: 'any-of',
            contains: [{
                type: 'number',
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
        update_existing: {
            type: 'boolean',
        },
        run_chunking: {
            type: 'boolean',
        },
        generate_embeddings: {
            type: 'boolean',
        },
        rechunk: {
            type: 'boolean',
        },
        reindex_search: {
            type: 'boolean',
        },
        rate_limit_delay: {
            type: 'number',
        },
        chunk_limit: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
