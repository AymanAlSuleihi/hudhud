/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EpigraphChunkOut } from './EpigraphChunkOut';
/**
 * Individual chunk search result.
 */
export type ChunkSearchResult = {
    chunk: EpigraphChunkOut;
    similarity_score: number;
    epigraph_id: number;
    epigraph_title: string;
    epigraph_period?: (string | null);
};

