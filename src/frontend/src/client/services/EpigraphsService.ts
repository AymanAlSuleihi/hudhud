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
     * Filter Epigraphs
     * Filter epigraphs by searching within all translations.
     * @returns EpigraphsOut Successful Response
     * @throws ApiError
     */
    public static epigraphsFilterEpigraphs({
        translationText,
        sortField,
        sortOrder,
        filters,
    }: {
        translationText: string,
        sortField?: (string | null),
        sortOrder?: (string | null),
        filters?: (string | null),
    }): CancelablePromise<EpigraphsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/filter',
            query: {
                'translation_text': translationText,
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
     * Full Text Search Epigraphs
     * Full text search epigraphs using OpenSearch when available, falling back to PostgreSQL.
     * @returns EpigraphsOut Successful Response
     * @throws ApiError
     */
    public static epigraphsFullTextSearchEpigraphs({
        searchText,
        fields,
        sortField,
        sortOrder,
        filters,
        skip,
        limit = 100,
        includeObjects = false,
        objectFields,
    }: {
        searchText: string,
        fields?: (string | null),
        sortField?: (string | null),
        sortOrder?: (string | null),
        filters?: (string | null),
        skip?: number,
        limit?: number,
        includeObjects?: boolean,
        objectFields?: (string | null),
    }): CancelablePromise<EpigraphsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/search',
            query: {
                'search_text': searchText,
                'fields': fields,
                'sort_field': sortField,
                'sort_order': sortOrder,
                'filters': filters,
                'skip': skip,
                'limit': limit,
                'include_objects': includeObjects,
                'object_fields': objectFields,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Semantic Search Epigraphs
     * @returns EpigraphsOut Successful Response
     * @throws ApiError
     */
    public static epigraphsSemanticSearchEpigraphs({
        text,
    }: {
        text: string,
    }): CancelablePromise<EpigraphsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/semantic_search/{text}',
            path: {
                'text': text,
            },
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
     * Read Epigraph By Dasi Id
     * Retrieve epigraph by DASI ID.
     * @returns EpigraphOut Successful Response
     * @throws ApiError
     */
    public static epigraphsReadEpigraphByDasiId({
        dasiId,
    }: {
        dasiId: number,
    }): CancelablePromise<EpigraphOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/dasi_id/{dasi_id}',
            path: {
                'dasi_id': dasiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Epigraph Text By Id
     * Retrieve epigraph text by ID.
     * @returns string Successful Response
     * @throws ApiError
     */
    public static epigraphsReadEpigraphTextById({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/{epigraph_id}/text',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Field Values
     * Get all possible values for all fields.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGetAllFieldValues(): CancelablePromise<Record<string, Array<any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/fields/all',
        });
    }
    /**
     * Get Filtered Field Values
     * Get field values based on current filters.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGetFilteredFieldValues({
        filters,
    }: {
        filters?: (string | null),
    }): CancelablePromise<Record<string, Array<any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/fields/filtered',
            query: {
                'filters': filters,
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
    public static epigraphsImportEpigraphs(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/import',
        });
    }
    /**
     * Import Epigraphs Range
     * Import epigraphs from external api in a range.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportEpigraphsRange({
        startId,
        endId,
        dasiPublished,
        updateExisting = false,
    }: {
        startId: number,
        endId: number,
        dasiPublished?: boolean,
        updateExisting?: boolean,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/import_range',
            query: {
                'start_id': startId,
                'end_id': endId,
                'dasi_published': dasiPublished,
                'update_existing': updateExisting,
            },
            errors: {
                422: `Validation Error`,
            },
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
     * Import Images Metrics
     * Get import images task metrics and progress.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportImagesMetrics({
        taskId,
    }: {
        taskId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/import_images/metrics/{task_id}',
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
            method: 'PUT',
            url: '/api/v1/epigraphs/transfer_fields',
        });
    }
    /**
     * Link To Sites
     * Link epigraphs to sites.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsLinkToSites(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/link_to_sites/all',
        });
    }
    /**
     * Link To Objects
     * Link epigraphs to objects.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsLinkToObjects(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/link_to_objects/all',
        });
    }
    /**
     * Generate Embeddings All
     * Generate embeddings for all epigraphs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGenerateEmbeddingsAll(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/generate_embeddings/all',
        });
    }
    /**
     * Generate Embeddings
     * Generate embeddings for a specific epigraph.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsGenerateEmbeddings({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/generate_embeddings/{epigraph_id}',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
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
    /**
     * Parse Words
     * Parse words in epigraph.epigraph_text.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsParseWords({
        epigraphId,
    }: {
        epigraphId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/{epigraph_id}/parse-words',
            path: {
                'epigraph_id': epigraphId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Parse All Words
     * Parse words in all epigraphs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsParseAllWords(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/parse-words',
        });
    }
    /**
     * Get Similar Epigraphs
     * Get epigraphs similar to the given epigraph based on embeddings.
     * @returns EpigraphsOut Successful Response
     * @throws ApiError
     */
    public static epigraphsGetSimilarEpigraphs({
        epigraphId,
        distanceThreshold,
        limit = 10,
        filters,
    }: {
        epigraphId: number,
        distanceThreshold?: (number | null),
        limit?: number,
        filters?: (string | null),
    }): CancelablePromise<EpigraphsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/epigraphs/{epigraph_id}/similar',
            path: {
                'epigraph_id': epigraphId,
            },
            query: {
                'distance_threshold': distanceThreshold,
                'limit': limit,
                'filters': filters,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import All Images
     * Import all images from DASI starting from start_rec_id until no more images are found.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportAllImages({
        startRecId = 1,
        imageSize = 'high',
        rateLimitDelay = 2,
        maxConsecutiveFailures = 50,
    }: {
        startRecId?: number,
        imageSize?: string,
        rateLimitDelay?: number,
        maxConsecutiveFailures?: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/import_images/all',
            query: {
                'start_rec_id': startRecId,
                'image_size': imageSize,
                'rate_limit_delay': rateLimitDelay,
                'max_consecutive_failures': maxConsecutiveFailures,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Images Range
     * Import images for a specific range of record IDs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsImportImagesRange({
        startRecId,
        endRecId,
        imageSize = 'high',
        rateLimitDelay = 2,
    }: {
        startRecId: number,
        endRecId: number,
        imageSize?: string,
        rateLimitDelay?: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/import_images/range',
            query: {
                'start_rec_id': startRecId,
                'end_rec_id': endRecId,
                'image_size': imageSize,
                'rate_limit_delay': rateLimitDelay,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Scrape Epigraphs Images Range
     * Scrape image details for epigraphs in a DASI ID range.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsScrapeEpigraphsImagesRange({
        startDasiId,
        endDasiId,
        rateLimitDelay = 10,
        maxRetries = 1,
    }: {
        startDasiId: number,
        endDasiId: number,
        rateLimitDelay?: number,
        maxRetries?: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/scrape_images/range',
            query: {
                'start_dasi_id': startDasiId,
                'end_dasi_id': endDasiId,
                'rate_limit_delay': rateLimitDelay,
                'max_retries': maxRetries,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Scrape All Epigraphs Images
     * Scrape image details for all epigraphs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsScrapeAllEpigraphsImages({
        rateLimitDelay = 10,
        updateExisting = false,
        maxRetries = 1,
    }: {
        rateLimitDelay?: number,
        updateExisting?: boolean,
        maxRetries?: number,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/scrape_images/all',
            query: {
                'rate_limit_delay': rateLimitDelay,
                'update_existing': updateExisting,
                'max_retries': maxRetries,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Scrape Epigraph Images Single
     * Scrape image details for a single epigraph by DASI ID.
     * @returns EpigraphOut Successful Response
     * @throws ApiError
     */
    public static epigraphsScrapeEpigraphImagesSingle({
        dasiId,
        rateLimitDelay = 10,
        maxRetries = 1,
    }: {
        dasiId: number,
        rateLimitDelay?: number,
        maxRetries?: number,
    }): CancelablePromise<EpigraphOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/epigraphs/scrape_images/{dasi_id}',
            path: {
                'dasi_id': dasiId,
            },
            query: {
                'rate_limit_delay': rateLimitDelay,
                'max_retries': maxRetries,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Move Images Free From Copyright
     * Move copyright free images from private to public storage and update epigraph records.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static epigraphsMoveImagesFreeFromCopyright(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/epigraphs/images/copyright',
        });
    }
}
