/**
 * Supabase-Compatible PostgreSQL Query Builder
 *
 * Drop-in replacement for @supabase/supabase-js query chains.
 * Translates .from().select().eq().order().limit() into parameterized SQL.
 *
 * @version 10.0.0
 */

import type { Pool } from 'pg';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

interface Filter {
  toSQL(params: unknown[], nextIdx: () => number): string;
}

interface OrderClause {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

interface SelectOptions {
  count?: 'exact';
  head?: boolean;
}

interface SupabaseResult<T = any> {
  data: T | null;
  error: { message: string; code: string; details?: string } | null;
  count?: number | null;
}

/* ------------------------------------------------------------------ */
/*  Filter implementations                                             */
/* ------------------------------------------------------------------ */

class EqFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" = $${nextIdx()}`;
  }
}

class NeqFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" != $${nextIdx()}`;
  }
}

class InFilter implements Filter {
  constructor(private col: string, private vals: unknown[]) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    if (this.vals.length === 0) return 'FALSE';
    const placeholders = this.vals.map((v) => {
      params.push(v);
      return `$${nextIdx()}`;
    });
    return `"${this.col}" IN (${placeholders.join(', ')})`;
  }
}

class IsFilter implements Filter {
  constructor(private col: string, private val: null) {}
  toSQL(_params: unknown[], _nextIdx: () => number): string {
    return `"${this.col}" IS NULL`;
  }
}

class NotFilter implements Filter {
  constructor(
    private col: string,
    private operator: string,
    private val: unknown,
  ) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    if (this.operator === 'is' && this.val === null) {
      return `"${this.col}" IS NOT NULL`;
    }
    if (this.operator === 'eq') {
      params.push(this.val);
      return `"${this.col}" != $${nextIdx()}`;
    }
    if (this.operator === 'in' && Array.isArray(this.val)) {
      if (this.val.length === 0) return 'TRUE';
      const placeholders = this.val.map((v) => {
        params.push(v);
        return `$${nextIdx()}`;
      });
      return `"${this.col}" NOT IN (${placeholders.join(', ')})`;
    }
    // Fallback
    params.push(this.val);
    return `"${this.col}" != $${nextIdx()}`;
  }
}

class LikeFilter implements Filter {
  constructor(
    private col: string,
    private pattern: string,
    private caseInsensitive: boolean,
  ) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.pattern);
    const op = this.caseInsensitive ? 'ILIKE' : 'LIKE';
    return `"${this.col}" ${op} $${nextIdx()}`;
  }
}

class LtFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" < $${nextIdx()}`;
  }
}

class LteFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" <= $${nextIdx()}`;
  }
}

class GtFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" > $${nextIdx()}`;
  }
}

class GteFilter implements Filter {
  constructor(private col: string, private val: unknown) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.val);
    return `"${this.col}" >= $${nextIdx()}`;
  }
}

class OverlapsFilter implements Filter {
  constructor(private col: string, private vals: unknown[]) {}
  toSQL(params: unknown[], nextIdx: () => number): string {
    params.push(this.vals);
    return `"${this.col}" && $${nextIdx()}`;
  }
}

/**
 * Parses Supabase-style OR filter strings like:
 *   "slug_en.eq.hello-world,slug_pl.eq.hello-world-pl"
 */
class OrFilter implements Filter {
  constructor(private filterString: string) {}

  toSQL(params: unknown[], nextIdx: () => number): string {
    const conditions = this.parseConditions(this.filterString);
    const sqlParts = conditions.map((cond) => {
      switch (cond.op) {
        case 'eq':
          params.push(cond.value);
          return `"${cond.column}" = $${nextIdx()}`;
        case 'neq':
          params.push(cond.value);
          return `"${cond.column}" != $${nextIdx()}`;
        case 'is':
          return cond.value === 'null'
            ? `"${cond.column}" IS NULL`
            : `"${cond.column}" IS NOT NULL`;
        case 'like':
          params.push(cond.value);
          return `"${cond.column}" LIKE $${nextIdx()}`;
        case 'ilike':
          params.push(cond.value);
          return `"${cond.column}" ILIKE $${nextIdx()}`;
        case 'gt':
          params.push(cond.value);
          return `"${cond.column}" > $${nextIdx()}`;
        case 'gte':
          params.push(cond.value);
          return `"${cond.column}" >= $${nextIdx()}`;
        case 'lt':
          params.push(cond.value);
          return `"${cond.column}" < $${nextIdx()}`;
        case 'lte':
          params.push(cond.value);
          return `"${cond.column}" <= $${nextIdx()}`;
        default:
          params.push(cond.value);
          return `"${cond.column}" = $${nextIdx()}`;
      }
    });
    return `(${sqlParts.join(' OR ')})`;
  }

  private parseConditions(
    str: string,
  ): Array<{ column: string; op: string; value: string }> {
    const results: Array<{ column: string; op: string; value: string }> = [];
    // Split on commas, but we need to be careful with values containing commas
    // Supabase format: column.operator.value
    const parts = str.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      // Match: column.operator.value (value may contain dots)
      const dotIndex = trimmed.indexOf('.');
      if (dotIndex === -1) continue;
      const column = trimmed.slice(0, dotIndex);
      const rest = trimmed.slice(dotIndex + 1);
      const opDotIndex = rest.indexOf('.');
      if (opDotIndex === -1) {
        // operator with no value (e.g., is.null)
        results.push({ column, op: rest, value: '' });
      } else {
        const op = rest.slice(0, opDotIndex);
        const value = rest.slice(opDotIndex + 1);
        results.push({ column, op, value });
      }
    }
    return results;
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: safe column quoting for SELECT                             */
/* ------------------------------------------------------------------ */

function quoteSelectColumns(columns: string): string {
  if (columns === '*') return '*';

  return columns
    .split(',')
    .map((c) => {
      const col = c.trim();
      if (!col) return '';
      // Already a star
      if (col === '*') return '*';
      // Has aggregate / function / cast — pass through as-is
      if (col.includes('(') || col.includes('::') || col.includes(' as ')) {
        return col;
      }
      // Simple column name — quote it
      return `"${col}"`;
    })
    .filter(Boolean)
    .join(', ');
}

/* ------------------------------------------------------------------ */
/*  Query Builder                                                      */
/* ------------------------------------------------------------------ */

export class PgQueryBuilder {
  private _pool: Pool;
  private _table: string;
  private _operation: Operation = 'select';
  private _selectColumns = '*';
  private _selectOptions: SelectOptions = {};
  private _filters: Filter[] = [];
  private _orderClauses: OrderClause[] = [];
  private _limitValue: number | null = null;
  private _data: Record<string, unknown> | Record<string, unknown>[] = {};
  private _upsertConflict: string | null = null;
  private _returningColumns: string | null = null;
  private _singleRow = false;
  private _maybeSingleRow = false;
  private _resolved = false;

  constructor(pool: Pool, table: string) {
    this._pool = pool;
    this._table = table;
  }

  /* ---------- Operation starters ---------- */

  select(
    columns?: string,
    options?: SelectOptions,
  ): PgQueryBuilder {
    // If called after insert/update/upsert/delete → set RETURNING
    if (this._operation !== 'select') {
      this._returningColumns = columns || '*';
      return this;
    }
    this._operation = 'select';
    this._selectColumns = columns || '*';
    if (options) this._selectOptions = options;
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): PgQueryBuilder {
    this._operation = 'insert';
    this._data = data;
    return this;
  }

  update(data: Record<string, unknown>): PgQueryBuilder {
    this._operation = 'update';
    this._data = data;
    return this;
  }

  upsert(
    data: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string },
  ): PgQueryBuilder {
    this._operation = 'upsert';
    this._data = data;
    this._upsertConflict = options?.onConflict || null;
    return this;
  }

  delete(): PgQueryBuilder {
    this._operation = 'delete';
    return this;
  }

  /* ---------- Filters ---------- */

  eq(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new EqFilter(column, value));
    return this;
  }

  neq(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new NeqFilter(column, value));
    return this;
  }

  in(column: string, values: unknown[]): PgQueryBuilder {
    this._filters.push(new InFilter(column, values));
    return this;
  }

  is(column: string, value: null): PgQueryBuilder {
    this._filters.push(new IsFilter(column, value));
    return this;
  }

  not(column: string, operator: string, value: unknown): PgQueryBuilder {
    this._filters.push(new NotFilter(column, operator, value));
    return this;
  }

  or(filterString: string): PgQueryBuilder {
    this._filters.push(new OrFilter(filterString));
    return this;
  }

  like(column: string, pattern: string): PgQueryBuilder {
    this._filters.push(new LikeFilter(column, pattern, false));
    return this;
  }

  ilike(column: string, pattern: string): PgQueryBuilder {
    this._filters.push(new LikeFilter(column, pattern, true));
    return this;
  }

  lt(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new LtFilter(column, value));
    return this;
  }

  lte(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new LteFilter(column, value));
    return this;
  }

  gt(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new GtFilter(column, value));
    return this;
  }

  gte(column: string, value: unknown): PgQueryBuilder {
    this._filters.push(new GteFilter(column, value));
    return this;
  }

  overlaps(column: string, values: unknown[]): PgQueryBuilder {
    this._filters.push(new OverlapsFilter(column, values));
    return this;
  }

  /* ---------- Modifiers ---------- */

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ): PgQueryBuilder {
    this._orderClauses.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst,
    });
    return this;
  }

  limit(count: number): PgQueryBuilder {
    this._limitValue = count;
    return this;
  }

  /* ---------- Terminators ---------- */

  single(): PromiseLike<SupabaseResult> {
    this._singleRow = true;
    return this;
  }

  maybeSingle(): PromiseLike<SupabaseResult> {
    this._maybeSingleRow = true;
    return this;
  }

  /* ---------- Thenable (makes the builder awaitable) ---------- */

  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  /* ---------- SQL builder + executor ---------- */

  private async execute(): Promise<SupabaseResult> {
    if (this._resolved) {
      return { data: null, error: { message: 'Query already executed', code: 'ALREADY_RESOLVED' } };
    }
    this._resolved = true;

    const params: unknown[] = [];
    let paramIdx = 0;
    const nextIdx = () => ++paramIdx;

    try {
      let sql: string;

      switch (this._operation) {
        case 'select':
          sql = this.buildSelect(params, nextIdx);
          break;
        case 'insert':
          sql = this.buildInsert(params, nextIdx);
          break;
        case 'update':
          sql = this.buildUpdate(params, nextIdx);
          break;
        case 'upsert':
          sql = this.buildUpsert(params, nextIdx);
          break;
        case 'delete':
          sql = this.buildDelete(params, nextIdx);
          break;
        default:
          return { data: null, error: { message: `Unknown operation: ${this._operation}`, code: 'UNKNOWN_OP' } };
      }

      const result = await this._pool.query(sql, params);

      // Handle count-only queries
      if (
        this._operation === 'select' &&
        this._selectOptions.count === 'exact' &&
        this._selectOptions.head
      ) {
        const count = parseInt(result.rows[0]?.count ?? '0', 10);
        return { data: null, error: null, count };
      }

      const rows = result.rows;

      // .single() — must be exactly 1 row
      if (this._singleRow) {
        if (rows.length === 0) {
          return {
            data: null,
            error: {
              message: 'JSON object requested, multiple (or no) rows returned',
              code: 'PGRST116',
              details: 'The result contains 0 rows',
            },
          };
        }
        if (rows.length > 1) {
          return {
            data: null,
            error: {
              message: 'JSON object requested, multiple (or no) rows returned',
              code: 'PGRST116',
              details: `The result contains ${rows.length} rows`,
            },
          };
        }
        return { data: rows[0], error: null };
      }

      // .maybeSingle() — 0 or 1 row
      if (this._maybeSingleRow) {
        if (rows.length === 0) {
          return { data: null, error: null };
        }
        if (rows.length > 1) {
          return {
            data: null,
            error: {
              message: 'JSON object requested, multiple (or no) rows returned',
              code: 'PGRST116',
              details: `The result contains ${rows.length} rows`,
            },
          };
        }
        return { data: rows[0], error: null };
      }

      return { data: rows, error: null };
    } catch (err: any) {
      console.error(`[PgQueryBuilder] SQL error on "${this._table}":`, err.message);
      return {
        data: null,
        error: {
          message: err.message || 'Unknown database error',
          code: err.code || 'UNKNOWN',
          details: err.detail || undefined,
        },
      };
    }
  }

  /* ---------- SQL generators ---------- */

  private buildSelect(params: unknown[], nextIdx: () => number): string {
    let sql: string;

    if (this._selectOptions.count === 'exact' && this._selectOptions.head) {
      sql = `SELECT COUNT(*) AS count FROM "${this._table}"`;
    } else {
      sql = `SELECT ${quoteSelectColumns(this._selectColumns)} FROM "${this._table}"`;
    }

    sql += this.buildWhere(params, nextIdx);
    sql += this.buildOrderBy();
    sql += this.buildLimit();
    return sql;
  }

  private buildInsert(params: unknown[], nextIdx: () => number): string {
    const rows = Array.isArray(this._data) ? this._data : [this._data];
    if (rows.length === 0) {
      return `SELECT 1 WHERE FALSE`; // no-op
    }

    const columns = Object.keys(rows[0]);
    const quotedCols = columns.map((c) => `"${c}"`).join(', ');
    const valueSets = rows.map((row) => {
      const placeholders = columns.map((col) => {
        params.push(row[col]);
        return `$${nextIdx()}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    let sql = `INSERT INTO "${this._table}" (${quotedCols}) VALUES ${valueSets.join(', ')}`;
    if (this._returningColumns) {
      sql += ` RETURNING ${quoteSelectColumns(this._returningColumns)}`;
    }
    return sql;
  }

  private buildUpdate(params: unknown[], nextIdx: () => number): string {
    const data = this._data as Record<string, unknown>;
    const setClauses = Object.entries(data).map(([col, val]) => {
      params.push(val);
      return `"${col}" = $${nextIdx()}`;
    });

    let sql = `UPDATE "${this._table}" SET ${setClauses.join(', ')}`;
    sql += this.buildWhere(params, nextIdx);

    if (this._returningColumns) {
      sql += ` RETURNING ${quoteSelectColumns(this._returningColumns)}`;
    }
    return sql;
  }

  private buildUpsert(params: unknown[], nextIdx: () => number): string {
    const rows = Array.isArray(this._data) ? this._data : [this._data];
    if (rows.length === 0) {
      return `SELECT 1 WHERE FALSE`;
    }

    const columns = Object.keys(rows[0]);
    const quotedCols = columns.map((c) => `"${c}"`).join(', ');
    const valueSets = rows.map((row) => {
      const placeholders = columns.map((col) => {
        params.push(row[col]);
        return `$${nextIdx()}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    // Determine conflict column(s)
    const conflictCol = this._upsertConflict || columns[0]; // Default to first column (usually PK)

    // Build SET clause for all non-conflict columns
    const updateCols = columns.filter((c) => !conflictCol.split(',').map(s => s.trim()).includes(c));
    const updateSet =
      updateCols.length > 0
        ? updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
        : columns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', '); // If all are conflict, update all anyway

    let sql = `INSERT INTO "${this._table}" (${quotedCols}) VALUES ${valueSets.join(', ')}`;
    sql += ` ON CONFLICT ("${conflictCol.split(',').map(s => s.trim()).join('", "')}") DO UPDATE SET ${updateSet}`;

    if (this._returningColumns) {
      sql += ` RETURNING ${quoteSelectColumns(this._returningColumns)}`;
    }
    return sql;
  }

  private buildDelete(params: unknown[], nextIdx: () => number): string {
    let sql = `DELETE FROM "${this._table}"`;
    sql += this.buildWhere(params, nextIdx);

    if (this._returningColumns) {
      sql += ` RETURNING ${quoteSelectColumns(this._returningColumns)}`;
    }
    return sql;
  }

  /* ---------- Shared clause builders ---------- */

  private buildWhere(params: unknown[], nextIdx: () => number): string {
    if (this._filters.length === 0) return '';
    const clauses = this._filters.map((f) => f.toSQL(params, nextIdx));
    return ` WHERE ${clauses.join(' AND ')}`;
  }

  private buildOrderBy(): string {
    if (this._orderClauses.length === 0) return '';
    const parts = this._orderClauses.map((o) => {
      let s = `"${o.column}" ${o.ascending ? 'ASC' : 'DESC'}`;
      if (o.nullsFirst !== undefined) {
        s += o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
      }
      return s;
    });
    return ` ORDER BY ${parts.join(', ')}`;
  }

  private buildLimit(): string {
    if (this._limitValue === null) return '';
    return ` LIMIT ${this._limitValue}`;
  }
}
