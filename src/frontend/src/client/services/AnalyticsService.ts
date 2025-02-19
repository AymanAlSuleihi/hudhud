/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Epigraphs Counts
     * Get the number of epigraphs
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsEpigraphsCounts(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/counts',
        });
    }
    /**
     * Activity Distribution
     * Generate activity data for ECharts timeline/bar
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsActivityDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/activity_distribution',
        });
    }
    /**
     * Calendar Heatmap
     * Generate calendar heatmap data for ECharts calendar heatmap
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsCalendarHeatmap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/calendar_heatmap',
        });
    }
    /**
     * Period Distribution
     * Generate period distribution data for ECharts timeline/bar
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsPeriodDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/period_distribution',
        });
    }
    /**
     * Period Script Typology Distribution
     * Generate period and script typology distribution data for ECharts stacked bar chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsPeriodScriptTypologyDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/period_script_typology_distribution',
        });
    }
    /**
     * Script Typology Distribution
     * Generate script typology distribution data for ECharts pie chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsScriptTypologyDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/script_typology_distribution',
        });
    }
    /**
     * Period Writing Techniques Distribution
     * Generate period and writing techniques distribution data for ECharts stacked bar chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsPeriodWritingTechniquesDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/period_writing_techniques_distribution',
        });
    }
    /**
     * Writing Techniques Distribution
     * Generate writing techniques distribution data for ECharts pie chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsWritingTechniquesDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/writing_techniques_distribution',
        });
    }
    /**
     * Test
     * Generate first published distribution data for ECharts timeline/bar
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsTest(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/test',
        });
    }
}
