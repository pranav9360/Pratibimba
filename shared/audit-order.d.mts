export function compareIdentifiers(a: unknown, b: unknown): number;
export function compareAuditRecords(a: {iqaNumber?: string; iqrNumber?: string; _id?: string; id?: string}, b: {iqaNumber?: string; iqrNumber?: string; _id?: string; id?: string}): number;
export function sortAuditRecords<T extends {iqaNumber?: string; iqrNumber?: string; _id?: string; id?: string}>(records: T[]): T[];
