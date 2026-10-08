-- Safe to run repeatedly against the existing database. This migration preserves rows.
USE one_tap;

-- Password-less legacy users remain in place and need an out-of-band password reset.
SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_hash') = 0,
  'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL',
  'SELECT ''users.password_hash already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'district') = 0,
  'ALTER TABLE users ADD COLUMN district VARCHAR(120) NULL',
  'SELECT ''users.district already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'locality') = 0,
  'ALTER TABLE users ADD COLUMN locality VARCHAR(120) NULL',
  'SELECT ''users.locality already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'accuracy_m') = 0,
  'ALTER TABLE users ADD COLUMN accuracy_m DECIMAL(9,2) NULL',
  'SELECT ''users.accuracy_m already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

ALTER TABLE sos_alerts
  MODIFY latitude DECIMAL(10,8) NULL,
  MODIFY longitude DECIMAL(11,8) NULL;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sos_alerts' AND column_name = 'accuracy_m') = 0,
  'ALTER TABLE sos_alerts ADD COLUMN accuracy_m DECIMAL(9,2) NULL',
  'SELECT ''sos_alerts.accuracy_m already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sos_alerts' AND column_name = 'dispatch_status') = 0,
  'ALTER TABLE sos_alerts ADD COLUMN dispatch_status VARCHAR(40) NOT NULL DEFAULT ''PENDING''',
  'SELECT ''sos_alerts.dispatch_status already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

CREATE TABLE IF NOT EXISTS districts (
  district_id INT NOT NULL AUTO_INCREMENT,
  state_id INT NOT NULL,
  district_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (district_id),
  UNIQUE KEY uq_district_state_name (state_id, district_name),
  CONSTRAINT fk_district_state FOREIGN KEY (state_id) REFERENCES states(state_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- This creates the structure only. Import an authoritative district list before
-- using district selection; no sample or guessed district names are inserted here.
