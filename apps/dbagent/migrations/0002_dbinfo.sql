CREATE TABLE IF NOT EXISTS dbinfo(
  id serial primary key,
  connid integer, 
  module text,
  data jsonb);

ALTER TABLE dbinfo ADD CONSTRAINT dbinfo_connid_fkey FOREIGN KEY (connid) REFERENCES connections(id);

ALTER TABLE dbinfo ADD CONSTRAINT dbinfo_module_unique UNIQUE (connid, module);