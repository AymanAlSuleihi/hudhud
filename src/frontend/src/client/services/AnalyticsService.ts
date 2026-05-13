/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Read Analytics Overview
     * Return summary metrics and chart-ready analytics for the public corpus.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsReadAnalyticsOverview(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/overview',
        });
    }
    /**
     * Read Site Map
     * Return the mapped-site atlas used by the public maps page.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsReadSiteMap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/site_map',
        });
    }
    /**
     * Read Epigraph Heatmap
     * Return published epigraph density by site and period for the public maps page.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsReadEpigraphHeatmap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/epigraph_heatmap',
        });
    }
    /**
     * Read Language Period Map
     * Return the language-by-period site map used by the public maps page.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsReadLanguagePeriodMap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/language_period_map',
        });
    }
}
