import { ClientBase } from './db';

/**
 * Validates that a SQL query is a single statement that's safe to execute with EXPLAIN.
 *
 * Checks:
 * - Single top-level statement (no semicolon-separated multiple commands)
 * - Top-level command is one of: SELECT, INSERT, UPDATE, DELETE, WITH
 * - Conservative approach: returns false if unsure (e.g., unterminated strings)
 *
 * @param query The SQL query to validate
 * @returns true if the query is a safe single statement, false otherwise
 */
export function isSingleStatement(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return false;
  }

  const parser = new SQLParser(trimmed);
  return parser.isSingleStatement();
}

class SQLParser {
  private input: string;
  private pos: number = 0;
  private len: number;

  constructor(input: string) {
    this.input = input;
    this.len = input.length;
  }

  isSingleStatement(): boolean {
    try {
      this.skipWhitespace();

      if (this.pos >= this.len) {
        return false; // Empty after whitespace
      }

      // Check if it starts with an allowed verb
      const verb = this.parseVerb();
      if (!verb || !this.isAllowedVerb(verb)) {
        return false;
      }

      this.parseStatement();
      this.skipWhitespaceAndComments();

      // Check if we're at the end or if there's only a trailing semicolon
      if (this.pos >= this.len) {
        return true; // No semicolon, single statement
      }

      if (this.input[this.pos] === ';') {
        this.pos++;
        this.skipWhitespaceAndComments();
        // After semicolon, there should be nothing left
        return this.pos >= this.len;
      }

      // If we have content after the statement that's not whitespace/comments/semicolon
      return false;
    } catch (error) {
      // Any parsing error means we can't be sure it's safe
      return false;
    }
  }

  private parseVerb(): string | null {
    this.skipWhitespaceAndComments();

    const start = this.pos;
    while (this.pos < this.len && /[A-Za-z_]/.test(this.input[this.pos]!)) {
      this.pos++;
    }

    if (this.pos === start) {
      return null;
    }

    return this.input.slice(start, this.pos).toUpperCase();
  }

  private isAllowedVerb(verb: string): boolean {
    const allowedVerbs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH'];
    return allowedVerbs.includes(verb);
  }

  private parseStatement(): void {
    while (this.pos < this.len) {
      const char = this.input[this.pos];

      if (char === ';') {
        // Found semicolon - this is the end of the statement
        return;
      } else if (char === "'") {
        this.parseSingleQuotedString();
      } else if (char === '"') {
        this.parseDoubleQuotedString();
      } else if (char === '$') {
        this.parseDollarQuotedString();
      } else if (char === '/' && this.pos + 1 < this.len && this.input[this.pos + 1] === '*') {
        this.parseBlockComment();
      } else if (char === '-' && this.pos + 1 < this.len && this.input[this.pos + 1] === '-') {
        this.parseLineComment();
      } else {
        this.pos++;
      }
    }
  }

  private parseSingleQuotedString(): void {
    this.pos++; // Skip opening quote
    while (this.pos < this.len) {
      const char = this.input[this.pos];
      if (char === "'") {
        this.pos++;
        return;
      } else if (char === '\\') {
        this.pos += 2; // Skip escaped character
      } else {
        this.pos++;
      }
    }
    throw new Error('Unterminated single-quoted string');
  }

  private parseDoubleQuotedString(): void {
    this.pos++; // Skip opening quote
    while (this.pos < this.len) {
      const char = this.input[this.pos];
      if (char === '"') {
        this.pos++;
        return;
      } else if (char === '\\') {
        this.pos += 2; // Skip escaped character
      } else {
        this.pos++;
      }
    }
    throw new Error('Unterminated double-quoted string');
  }

  private parseDollarQuotedString(): void {
    // Find the tag
    const start = this.pos;
    this.pos++; // Skip initial $

    while (this.pos < this.len && this.input[this.pos] !== '$') {
      this.pos++;
    }

    if (this.pos >= this.len) {
      throw new Error('Unterminated dollar-quoted string tag');
    }

    const tag = this.input.slice(start, this.pos + 1);
    this.pos++; // Skip closing $ of tag

    // Find the closing tag
    while (this.pos < this.len) {
      if (this.input.slice(this.pos, this.pos + tag.length) === tag) {
        this.pos += tag.length;
        return;
      }
      this.pos++;
    }

    throw new Error('Unterminated dollar-quoted string');
  }

  private parseBlockComment(): void {
    this.pos += 2; // Skip /*
    while (this.pos < this.len - 1) {
      if (this.input[this.pos] === '*' && this.input[this.pos + 1] === '/') {
        this.pos += 2;
        return;
      }
      this.pos++;
    }
    throw new Error('Unterminated block comment');
  }

  private parseLineComment(): void {
    this.pos += 2; // Skip --
    while (this.pos < this.len && this.input[this.pos] !== '\n') {
      this.pos++;
    }
    // Don't consume the newline, let skipWhitespace handle it
  }

  private skipWhitespace(): void {
    while (this.pos < this.len && /\s/.test(this.input[this.pos]!)) {
      this.pos++;
    }
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.len) {
      const char = this.input[this.pos]!;

      if (/\s/.test(char)) {
        this.pos++;
      } else if (char === '-' && this.pos + 1 < this.len && this.input[this.pos + 1] === '-') {
        this.parseLineComment();
      } else if (char === '/' && this.pos + 1 < this.len && this.input[this.pos + 1] === '*') {
        this.parseBlockComment();
      } else {
        break;
      }
    }
  }
}

export async function unsafeExplainQuery(client: ClientBase, schema: string, query: string): Promise<string> {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    return 'Invalid schema name. Only alphanumeric characters and underscores are allowed.';
  }

  if (!isSingleStatement(query)) {
    return 'The query is not a single safe statement. Only SELECT, INSERT, UPDATE, DELETE, and WITH statements are allowed.';
  }

  if (query.includes('$1') || query.includes('$2') || query.includes('$3') || query.includes('$4')) {
    // TODO: we could use `GENERIC_PLAN` to still get the plan in this case.
    return 'The query seems to contain placeholders ($1, $2, etc). Replace them with actual values and try again.';
  }
  let toReturn = '';
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '2000ms'");
    await client.query("SET LOCAL lock_timeout = '200ms'");
    await client.query(`SET search_path TO ${schema}`);
    const explainQuery = `EXPLAIN ${query}`;
    console.log(schema);
    console.log(explainQuery);
    const result = await client.query(explainQuery);
    console.log(result.rows);
    toReturn = result.rows.map((row: { [key: string]: string }) => row['QUERY PLAN']).join('\n');
  } catch (error) {
    console.error('Error explaining query', error);
    toReturn = 'I could not run EXPLAIN on that query. Try a different method.';
  }
  await client.query('ROLLBACK');
  return toReturn;
}
