/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OpensearchService {
    /**
     * Reindex All Epigraphs
     * Reindex all epigraphs to OpenSearch.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static opensearchReindexAllEpigraphs(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/opensearch/reindex',
        });
    }
    /**
     * Get Opensearch Stats
     * Get OpenSearch index statistics.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static opensearchGetOpensearchStats(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/opensearch/stats',
        });
    }
    /**
     * Index Epigraph
     * Index a specific epigraph to OpenSearch.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static opensearchIndexEpigraph({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/opensearch/index/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
