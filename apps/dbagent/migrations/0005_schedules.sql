CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  connection_id INT NOT NULL REFERENCES connections(id),
  playbook VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(255),
  additional_instructions TEXT,
  min_interval INT,
  max_interval INT,
  enabled BOOLEAN NOT NULL
);
