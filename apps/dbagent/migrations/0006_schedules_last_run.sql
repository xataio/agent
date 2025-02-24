CREATE TYPE schedule_status AS ENUM ('disabled', 'scheduled', 'running');

ALTER TABLE schedules ADD COLUMN last_run TIMESTAMP;
ALTER TABLE schedules ADD COLUMN next_run TIMESTAMP;
ALTER TABLE schedules ADD COLUMN status schedule_status DEFAULT 'disabled';
ALTER TABLE schedules ADD COLUMN failures INTEGER DEFAULT 0;
