/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EpigraphChunkCreate = {
    epigraph_id: number;
    chunk_text: string;
    /**
     * Type of chunk: translation, cultural_notes, apparatus_notes, general_notes, object_description, named_entities
     */
    chunk_type: string;
    /**
     * Position/order of this chunk within the epigraph
     */
    chunk_index?: number;
    /**
     * Additional context: title, period, language, topic, etc.
     */
    chunk_metadata?: Record<string, any>;
    /**
     * Number of tokens in chunk_text for budget management
     */
    token_count?: number;
    /**
     * Vector embedding of chunk_text
     */
    embedding?: (Array<number> | null);
};

