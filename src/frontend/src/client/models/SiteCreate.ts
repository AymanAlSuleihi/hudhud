/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SiteCreate = {
    dasi_object?: Record<string, any>;
    dasi_id: number;
    uri: string;
    modern_name: string;
    ancient_name: string;
    country?: (string | null);
    governorate?: (string | null);
    geographical_area?: (string | null);
    coordinates?: (any[] | null);
    coordinates_accuracy?: (string | null);
    location_and_toponomy?: (string | null);
    type_of_site?: (string | null);
    editors?: null;
    license: string;
    first_published?: (string | null);
    last_modified?: (string | null);
    general_description?: (string | null);
    notes?: (Array<string> | null);
    bibliography?: null;
    classical_sources?: (Array<string> | null);
    archaeological_missions?: (Array<string> | null);
    travellers?: (Array<string> | null);
    history_of_research?: (string | null);
    chronology?: (string | null);
    monuments?: null;
    structures?: (Array<string> | null);
    deities?: (Array<string> | null);
    tribe?: (Array<string> | null);
    identification?: (string | null);
    kingdom?: (Array<string> | null);
    language?: (string | null);
    dasi_published?: (boolean | null);
};

