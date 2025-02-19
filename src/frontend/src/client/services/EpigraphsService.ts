/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EpigraphCreate } from '../models/EpigraphCreate';
import type { EpigraphOut } from '../models/EpigraphOut';
import type { EpigraphsOut } from '../models/EpigraphsOut';
import type { EpigraphUpdate } from '../models/EpigraphUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EpigraphsService {
    /**
     * Read Epigraphs
     * Retrieve epigraphs.
     * @returns EpigraphsOut Successful Response
     * @throws ApiError
     */
    public static epigraphsReadEpigraphs({
        skip,
        limit = 100,
        sortField,
        sortOrder,
        filters,
    }: {
        skip?: number,
        limit?: number,
        sortField?: (string | null),
        sortOrder?: (string | null),
        filters?: (string | null),
    }): CancelablePromise<EpigraphsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/',
            query: {
                'skip': skip,
                'limit': limit,
                'sort_field': sortField,
                'sort_order': sortOrder,
                'filters': filters,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Epigraph
     * Create new epigraph.
     * @returns EpigraphOut Successful Response
     * @throws ApiError
     */
    public static epigraphsCreateEpigraph({
        requestBody,
    }: {
        requestBody: EpigraphCreate,
    }): CancelablePromise<EpigraphOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Epigraph By Id
     * Retrieve epigraph by ID.
     * @returns EpigraphOut Successful Response
     * @throws ApiError
     */
    public static epigraphsReadEpigraphById({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<EpigraphOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Epigraph
     * Update epigraph.
     * @returns EpigraphOut Successful Response
     * @throws ApiError
     */
    public static epigraphsUpdateEpigraph({
        epigraphId,
        requestBody,
    }: {
        epigraphId: number,
        requestBody: EpigraphUpdate,
    }): CancelablePromise<EpigraphOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Epigraph
     * Delete epigraph.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsDeleteEpigraph({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/epigraphs/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Epigraphs
     * Import epigraphs from external api.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportEpigraphs(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/import',
        });
    }
    /**
     * Import Epigraphs Metrics
     * Get import epigraphs task metrics.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportEpigraphsMetrics({
        taskId,
    }: {
        taskId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/import_metrics/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Epigraph Fields
     * Get list of fields in all epigraph.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGetEpigraphFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/fields/dasi_object',
        });
    }
    /**
     * Get Epigraph Missing Fields
     * Get list of fields which are not in all epigraph.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGetEpigraphMissingFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/fields/dasi_object/missing',
        });
    }
    /**
     * Transfer Fields
     * Transfer fields for every epigraph object that's already in the db.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsTransferFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/transfer_fields',
        });
    }
    /**
     * Analyze Epigraphs
     * Perform analysis on the epigraphs and return the results for Apache ECharts.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsAnalyzeEpigraphs(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/analysis/count_by_period',
        });
    }
    /**
     * Analyze Words
     * Get list of all words in epigraphs and their counts and display in Apache ECharts.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsAnalyzeWords(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/analysis/words',
        });
    }
    /**
     * Analyze Writing Techniques
     * Get writing techniques distribution by period and display in Apache ECharts.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsAnalyzeWritingTechniques(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/analysis/writing_techniques',
        });
    }
}
