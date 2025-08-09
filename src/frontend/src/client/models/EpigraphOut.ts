/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectMinimal } from './ObjectMinimal';
import type { SiteMinimal } from './SiteMinimal';
export type EpigraphOut = {
    id: number;
    dasi_id: number;
    title: string;
    uri: string;
    epigraph_text: string;
    translations?: null;
    period?: (string | null);
    chronology_conjectural: boolean;
    mentioned_date?: (string | null);
    sites?: null;
    language_level_1?: (string | null);
    language_level_2?: (string | null);
    language_level_3?: (string | null);
    alphabet?: (string | null);
    script_typology?: (string | null);
    script_cursus?: (Array<string> | null);
    textual_typology?: (string | null);
    textual_typology_conjectural: boolean;
    letter_measure?: (string | null);
    writing_techniques?: (Array<string> | null);
    royal_inscription: boolean;
    cultural_notes?: null;
    apparatus_notes?: null;
    general_notes?: (string | null);
    bibliography?: null;
    concordances?: (Array<string> | null);
    license: string;
    first_published?: (string | null);
    editors?: null;
    last_modified?: (string | null);
    dasi_published?: (boolean | null);
    images?: null;
    objects?: Array<ObjectMinimal>;
    sites_objs?: Array<SiteMinimal>;
};

