/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EpigraphQueryRequest = {
    search_text?: string;
    fields?: Array<string>;
    scope_keys?: (Array<string> | null);
    include_objects?: boolean;
    object_fields?: Array<string>;
    filters?: Record<string, any>;
    page?: number;
    page_size?: number;
    sort_field?: (string | null);
    sort_order?: (string | null);
};

