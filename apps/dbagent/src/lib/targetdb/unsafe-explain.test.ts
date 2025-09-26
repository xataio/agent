import { isSingleStatement } from './unsafe-explain';

describe('isSingleStatement', () => {
  describe('positive tests - should return true', () => {
    test('basic SELECT statements', () => {
      expect(isSingleStatement('SELECT 1')).toBe(true);
      expect(isSingleStatement('SELECT 1;')).toBe(true);
      expect(isSingleStatement('  SELECT 1  ;  ')).toBe(true);
    });

    test('SELECT with semicolons in strings', () => {
      expect(isSingleStatement("SELECT 'a;semicolon' AS s FROM test")).toBe(true);
      expect(isSingleStatement('SELECT $$;$$')).toBe(true);
      expect(isSingleStatement('SELECT $$;$$;')).toBe(true);
      expect(isSingleStatement('SELECT "col;name" FROM test')).toBe(true);
      expect(isSingleStatement("SELECT E'line\\nwith;semicolon';")).toBe(true);
    });

    test('CTEs (WITH statements)', () => {
      expect(isSingleStatement('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe(true);
      expect(isSingleStatement('WITH a AS (SELECT 1), b AS (SELECT 2) SELECT * FROM a JOIN b ON true')).toBe(true);
      expect(
        isSingleStatement(
          'WITH moved AS (DELETE FROM tasks WHERE done RETURNING id) INSERT INTO archive SELECT * FROM moved'
        )
      ).toBe(true);
      expect(isSingleStatement('WITH foo AS (UPDATE bar SET x = 1 RETURNING *) SELECT * FROM foo')).toBe(true);
    });

    test('DML statements', () => {
      expect(isSingleStatement("INSERT INTO public.tbl (id, name) VALUES (1, 'x')")).toBe(true);
      expect(isSingleStatement("UPDATE public.users SET name = 'Bob' WHERE id = 3")).toBe(true);
      expect(isSingleStatement("DELETE FROM logs WHERE ts < now() - interval '30 days'")).toBe(true);
    });

    test('complex statements with schema names', () => {
      expect(isSingleStatement('SELECT * FROM schema_name.table_name;')).toBe(true);
    });

    test('complex SELECT with CASE, JOIN, UNION ALL and parameterized queries', () => {
      const complexQuery = `SELECT CASE WHEN $3 < LENGTH(CAST("public"."Post"."geoJson" AS TEXT)) THEN $4 ELSE "public"."Post"."geoJson" END AS "geoJson", CASE WHEN $5 < LENGTH(CAST("public"."Post"."runs" AS TEXT)) THEN $6 ELSE "public"."Post"."runs" END AS "runs", CASE WHEN $7 < LENGTH(CAST("public"."Post"."sprints" AS TEXT)) THEN $8 ELSE "public"."Post"."sprints" END AS "sprints" FROM "public"."Post" INNER JOIN ( (SELECT "public"."Post"."id" FROM "public"."Post" ORDER BY "public"."Post"."id" ASC LIMIT $1) UNION ALL (SELECT "public"."Post"."id" FROM "public"."Post" ORDER BY "public"."Post"."id" DESC LIMIT $2) ) AS "result" ON ("result"."id" = "public"."Post"."id")`;
      expect(isSingleStatement(complexQuery)).toBe(true);
    });

    test('complex multi-line statement with comments and quotes', () => {
      const complexQuery = `
        /* multi-line comment */
        WITH t AS (
          SELECT id, jsonb_build_object('a','b;c') AS j
          FROM items
          WHERE data->>'x' = 'foo;bar'
        )
        SELECT * FROM t;
      `;
      expect(isSingleStatement(complexQuery)).toBe(true);
    });

    test('statements with comments', () => {
      expect(isSingleStatement('SELECT 1 -- comment')).toBe(true);
      expect(isSingleStatement('SELECT 1 /* comment */')).toBe(true);
      expect(isSingleStatement('SELECT 1; -- trailing comment')).toBe(true);
    });
  });

  describe('negative tests - should return false', () => {
    test('multiple top-level statements', () => {
      expect(isSingleStatement('SELECT 1; SELECT 2;')).toBe(false);
      expect(isSingleStatement('SELECT 1; -- comment\nSELECT 2;')).toBe(false);
      expect(isSingleStatement('SELECT 1;;')).toBe(false);
      expect(isSingleStatement('; SELECT 1')).toBe(false);
      expect(isSingleStatement('SELECT 1;  /*comment*/ SELECT 2')).toBe(false);
    });

    test('disallowed starting verbs', () => {
      expect(isSingleStatement('ANALYZE select 1;')).toBe(false);
      expect(isSingleStatement('(ANALYZE select 1)')).toBe(false);
      expect(isSingleStatement('EXPLAIN SELECT 1')).toBe(false);
      expect(isSingleStatement('VACUUM;')).toBe(false);
      expect(isSingleStatement('CREATE TABLE t (id int);')).toBe(false);
      expect(isSingleStatement('DROP TABLE t;')).toBe(false);
      expect(isSingleStatement('ALTER TABLE t ADD COLUMN x int;')).toBe(false);
      expect(isSingleStatement('GRANT SELECT ON t TO u;')).toBe(false);
      expect(isSingleStatement('REVOKE ALL ON t FROM u;')).toBe(false);
      expect(isSingleStatement('TRUNCATE logs;')).toBe(false);
    });

    test('unterminated/malformed quoting', () => {
      expect(isSingleStatement("SELECT 'unterminated literal")).toBe(false);
      expect(isSingleStatement('SELECT "unterminated identifier')).toBe(false);
      expect(isSingleStatement('SELECT $$unterminated dollar')).toBe(false);
      expect(isSingleStatement('SELECT 1 /* unclosed comment')).toBe(false);
    });

    test('unbalanced parentheses and weird constructs', () => {
      expect(isSingleStatement('((SELECT 1)')).toBe(false);
      expect(isSingleStatement('( (ANALYZE SELECT 1 ) )')).toBe(false);
    });

    test('extra content after trailing semicolon', () => {
      expect(isSingleStatement('SELECT 1; extra')).toBe(false);
      expect(isSingleStatement('SELECT 1; /*comment*/ extra')).toBe(false);
    });

    test('multi-statement disguised across comments', () => {
      expect(isSingleStatement('SELECT 1; /* */ SELECT 2')).toBe(false);
    });

    test('whitespace/empty input', () => {
      expect(isSingleStatement('')).toBe(false);
      expect(isSingleStatement('   \n\t  ')).toBe(false);
    });

    test('non-string input', () => {
      expect(isSingleStatement(null as any)).toBe(false);
      expect(isSingleStatement(undefined as any)).toBe(false);
      expect(isSingleStatement(123 as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('nested parentheses with semicolons', () => {
      expect(isSingleStatement('SELECT (SELECT 1; SELECT 2)')).toBe(false);
      expect(isSingleStatement('SELECT (SELECT 1)')).toBe(true);
    });

    test('dollar-quoted strings with complex tags', () => {
      expect(isSingleStatement('SELECT $tag$content;with;semicolons$tag$')).toBe(true);
      expect(isSingleStatement('SELECT $tag$content$tag$; SELECT 2')).toBe(false);
    });

    test('escaped characters in strings', () => {
      expect(isSingleStatement("SELECT 'escaped\\'quote'")).toBe(true);
      expect(isSingleStatement('SELECT "escaped\\"quote"')).toBe(true);
    });

    test('line comments with newlines', () => {
      expect(isSingleStatement('SELECT 1 -- comment\n-- another comment')).toBe(true);
      expect(isSingleStatement('SELECT 1; -- comment\nSELECT 2')).toBe(false);
    });

    test('block comments spanning multiple lines', () => {
      expect(isSingleStatement('SELECT 1 /*\nmulti-line\ncomment\n*/')).toBe(true);
      expect(isSingleStatement('SELECT 1; /* comment */ SELECT 2')).toBe(false);
    });

    test('starting with a comment', () => {
      expect(isSingleStatement('-- comment')).toBe(false);
      expect(isSingleStatement('-- comment\nSELECT 1')).toBe(true);
    });
  });
});
