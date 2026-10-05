/** Persistence of the per-note footprint totals. */
export interface MarkStore {
  /** Current total of a note; 0 when it has none yet. */
  total(slug: string): Promise<number>;
  /** Atomically adds `by` footprints and returns the new total. */
  add(slug: string, by: number): Promise<number>;
}

/** Abuse brake keyed by client address; the address never leaves the limiter. */
export interface MarkLimiter {
  allow(ip: string): Promise<boolean>;
}

/** The published notes: only these slugs may hold footprints. */
export interface NoteCatalog {
  has(slug: string): boolean;
}

export interface MarksPorts {
  store: MarkStore;
  limiter: MarkLimiter;
  catalog: NoteCatalog;
}
