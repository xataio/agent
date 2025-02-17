CREATE TABLE IF NOT EXISTS connections(
  id serial primary key, 
  name text,
  is_default boolean,
  connstring text,
  params jsonb
);

ALTER TABLE connections ADD CONSTRAINT connections_name_unique UNIQUE (name);
ALTER TABLE connections ADD CONSTRAINT connections_connstring_unique UNIQUE (connstring);

