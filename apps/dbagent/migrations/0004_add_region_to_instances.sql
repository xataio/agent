ALTER TABLE instances RENAME TO clusters;
ALTER TABLE assoc_instance_connections RENAME TO assoc_cluster_connections;
ALTER TABLE clusters RENAME COLUMN instance_identifier TO cluster_identifier;
ALTER TABLE assoc_cluster_connections RENAME COLUMN instance_id TO cluster_id;
ALTER TABLE clusters ADD COLUMN region TEXT NOT NULL DEFAULT 'us-east-1';
