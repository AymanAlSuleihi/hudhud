/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WordConnection } from './WordConnection';
export type WordOut = {
    word: string;
    classification?: (string | null);
    attributes?: (Record<string, any> | null);
    id: number;
    frequency: number;
    words?: Array<WordConnection>;
};

