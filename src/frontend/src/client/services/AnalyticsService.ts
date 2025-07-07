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
     * Period Distribution Line
     * Generate period distribution data for ECharts line chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsPeriodDistributionLine({
        requestBody,
    }: {
        requestBody: Array<number>,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/analytics/period_distribution_line',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Translated Status Distribution
     * Generate translated status distribution data for ECharts pie chart
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsTranslatedStatusDistribution(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/translated_status_distribution',
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
    /**
     * Site Heatmap
     * Cache site heatmap data
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsSiteHeatmap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/analytics/cache/site_heatmap',
        });
    }
    /**
     * Get Site Heatmap
     * Get cached site heatmap data
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsGetSiteHeatmap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/site_heatmap',
        });
    }
    /**
     * Cache
     * Cache analytics data
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsCache(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/analytics/cache',
        });
    }
    /**
     * Language Period Map
     * Cache language by period map data
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsLanguagePeriodMap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/analytics/cache/language_period_map',
        });
    }
    /**
     * Get Language Period Map
     * Get cached language period map data
     * @returns any Successful Response
     * @throws ApiError
     */
    public static analyticsGetLanguagePeriodMap(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/analytics/language_period_map',
        });
    }
}
