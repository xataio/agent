-- Create the dbagent database if it doesn't exist
SELECT 'CREATE DATABASE dbagent' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dbagent');