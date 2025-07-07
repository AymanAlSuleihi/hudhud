/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SiteCreate } from '../models/SiteCreate';
import type { SiteOut } from '../models/SiteOut';
import type { SitesOut } from '../models/SitesOut';
import type { SiteUpdate } from '../models/SiteUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SitesService {
    /**
     * Read Sites
     * Retrieve sites.
     * @returns SitesOut Successful Response
     * @throws ApiError
     */
    public static sitesReadSites({
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
    }): CancelablePromise<SitesOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/',
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
     * Create Site
     * Create a new site.
     * @returns SiteOut Successful Response
     * @throws ApiError
     */
    public static sitesCreateSite({
        requestBody,
    }: {
        requestBody: SiteCreate,
    }): CancelablePromise<SiteOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/sites/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Site
     * Retrieve a site by ID.
     * @returns SiteOut Successful Response
     * @throws ApiError
     */
    public static sitesReadSite({
        siteId,
    }: {
        siteId: number,
    }): CancelablePromise<SiteOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Site
     * Update a site by ID.
     * @returns SiteOut Successful Response
     * @throws ApiError
     */
    public static sitesUpdateSite({
        siteId,
        requestBody,
    }: {
        siteId: number,
        requestBody: SiteUpdate,
    }): CancelablePromise<SiteOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Site
     * Delete a site by ID.
     * @returns SiteOut Successful Response
     * @throws ApiError
     */
    public static sitesDeleteSite({
        siteId,
    }: {
        siteId: number,
    }): CancelablePromise<SiteOut> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Site By Dasi Id
     * Retrieve a site by DASI ID.
     * @returns SiteOut Successful Response
     * @throws ApiError
     */
    public static sitesReadSiteByDasiId({
        dasiId,
    }: {
        dasiId: number,
    }): CancelablePromise<SiteOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/dasi_id/{dasi_id}',
            path: {
                'dasi_id': dasiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Sites
     * Import sites from external api.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesImportSites({
        dasiId,
    }: {
        dasiId?: (number | null),
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/sites/import',
            query: {
                'dasi_id': dasiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Sites Range
     * Import sites from external api in a range.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesImportSitesRange({
        startId,
        endId,
    }: {
        startId: number,
        endId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/sites/import_range',
            query: {
                'start_id': startId,
                'end_id': endId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Site Fields
     * Get list of fields in all site.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetSiteFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/fields/dasi_object',
        });
    }
    /**
     * Get Site Missing Fields
     * Get list of fields which are not in all Site.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetSiteMissingFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/fields/dasi_object/missing',
        });
    }
    /**
     * Transfer Fields
     * Transfer fields for every site object that's already in the db.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesTransferFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/sites/transfer_fields',
        });
    }
    /**
     * Link Sites To Epigraphs
     * Link sites to epigraphs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesLinkSitesToEpigraphs(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/sites/link_to_epigraphs/all',
        });
    }
    /**
     * Link Sites To Objects
     * Link sites to objects.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesLinkSitesToObjects(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/sites/link_to_objects/all',
        });
    }
    /**
     * Scrape Site
     * Scrape a site by ID.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesScrapeSite({
        siteId,
    }: {
        siteId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/scrape/{site_id}',
            path: {
                'site_id': siteId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Scrape All Sites
     * Scrape all sites.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesScrapeAllSites(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/sites/scrape/all',
        });
    }
    /**
     * Get Scraped Data Keys
     * Get a list of all keys within dasi_object.scraped_data.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetScrapedDataKeys(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/scraped_data/keys',
        });
    }
    /**
     * Get Scraped Data Missing Keys
     * Get a list of fields within dasi_object.scraped_data which are not in all sites.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetScrapedDataMissingKeys(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/scraped_data/keys/missing',
        });
    }
    /**
     * Get Scraped Data Key
     * Get a list of all values for a specific key within dasi_object.scraped_data.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetScrapedDataKey({
        key,
    }: {
        key: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/scraped_data/{key}',
            path: {
                'key': key,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Scraped Data Key Missing
     * Get a list of all values for a specific key within dasi_object.scraped_data which are not in all sites.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesGetScrapedDataKeyMissing({
        key,
    }: {
        key: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/sites/scraped_data/{key}/missing',
            path: {
                'key': key,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Transfer Scraped Data
     * Transfer scraped data for every site object that's already in the db.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sitesTransferScrapedData(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/sites/scraped_data/transfer',
        });
    }
}
