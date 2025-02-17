CREATE TABLE IF NOT EXISTS integrations(
  id serial primary key,
  name text,
  data jsonb);

ALTER TABLE integrations ADD CONSTRAINT integrations_name_unique UNIQUE (name);

CREATE TABLE instances(
  id serial primary key,
  instance_identifier text,
  integration text,
  data jsonb
);

ALTER TABLE instances ADD CONSTRAINT instances_integration_fkey FOREIGN KEY (integration) REFERENCES integrations(name);
ALTER TABLE instances ADD CONSTRAINT instances_integration_identifier_unique UNIQUE (integration, instance_identifier);

CREATE TABLE IF NOT EXISTS assoc_instance_connections(
  id serial primary key,
  instance_id int,
  connection_id int
);

ALTER TABLE assoc_instance_connections ADD CONSTRAINT assoc_instance_connections_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES instances(id);
ALTER TABLE assoc_instance_connections ADD CONSTRAINT assoc_instance_connections_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES connections(id);
