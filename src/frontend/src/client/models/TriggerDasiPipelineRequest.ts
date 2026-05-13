/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TriggerDasiPipelineRequest = {
    import_sites?: boolean;
    import_objects?: boolean;
    import_epigraphs?: boolean;
    incremental?: boolean;
    start_id?: (number | null);
    end_id?: (number | null);
    dasi_published?: (boolean | null);
    update_existing?: boolean;
    run_chunking?: boolean;
    generate_embeddings?: boolean;
    rechunk?: boolean;
    reindex_search?: boolean;
    rate_limit_delay?: number;
    chunk_limit?: (number | null);
};

