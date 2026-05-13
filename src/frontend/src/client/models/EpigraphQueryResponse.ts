/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EpigraphFacetBucket } from './EpigraphFacetBucket';
import type { EpigraphFacetSchemaFieldResponse } from './EpigraphFacetSchemaFieldResponse';
import type { EpigraphsOut } from './EpigraphsOut';
export type EpigraphQueryResponse = {
    results: EpigraphsOut;
    facets: Record<string, Array<(string | boolean | number | Array<string>)>>;
    facet_counts: Record<string, Array<EpigraphFacetBucket>>;
    facet_schema: Array<EpigraphFacetSchemaFieldResponse>;
    page: number;
    page_size: number;
    sort_field?: (string | null);
    sort_order: string;
};

