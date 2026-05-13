/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EpigraphSearchDefaultsResponse } from './EpigraphSearchDefaultsResponse';
import type { EpigraphSearchFieldResponse } from './EpigraphSearchFieldResponse';
import type { EpigraphSearchOperatorResponse } from './EpigraphSearchOperatorResponse';
import type { EpigraphSearchScopeResponse } from './EpigraphSearchScopeResponse';
import type { EpigraphSearchSortOptionResponse } from './EpigraphSearchSortOptionResponse';
export type EpigraphSearchSchemaResponse = {
    fields: Array<EpigraphSearchFieldResponse>;
    scopes: Array<EpigraphSearchScopeResponse>;
    sortOptions: Array<EpigraphSearchSortOptionResponse>;
    defaults: EpigraphSearchDefaultsResponse;
    operators: Array<EpigraphSearchOperatorResponse>;
};

