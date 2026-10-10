-- Extend profile geography while preserving existing user/profile data.
-- Apply after migration_001_security_profile.sql.
USE one_tap;

-- India and the existing country IDs remain unchanged. New rows receive IDs
-- from AUTO_INCREMENT, so deployments with different existing IDs are safe.
INSERT INTO countries (country_name, country_code)
SELECT 'Canada', 'CA' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Canada');
INSERT INTO countries (country_name, country_code)
SELECT 'Australia', 'AU' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Australia');
INSERT INTO countries (country_name, country_code)
SELECT 'Saudi Arabia', 'SA' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Saudi Arabia');
INSERT INTO countries (country_name, country_code)
SELECT 'Qatar', 'QA' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Qatar');
INSERT INTO countries (country_name, country_code)
SELECT 'Singapore', 'SG' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Singapore');
INSERT INTO countries (country_name, country_code)
SELECT 'Malaysia', 'MY' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Malaysia');
INSERT INTO countries (country_name, country_code)
SELECT 'Germany', 'DE' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Germany');
INSERT INTO countries (country_name, country_code)
SELECT 'France', 'FR' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'France');
INSERT INTO countries (country_name, country_code)
SELECT 'Japan', 'JP' WHERE NOT EXISTS
  (SELECT 1 FROM countries WHERE country_name = 'Japan');

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'states' AND column_name = 'region_type') = 0,
  'ALTER TABLE states ADD COLUMN region_type VARCHAR(40) NULL AFTER state_name',
  'SELECT ''states.region_type already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

UPDATE states SET region_type = 'State' WHERE country_id = 1 AND state_name NOT IN (
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
);
UPDATE states SET region_type = 'Union Territory' WHERE country_id = 1 AND state_name IN (
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
);
UPDATE states SET region_type = 'Region' WHERE region_type IS NULL;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'district_id') = 0,
  'ALTER TABLE users ADD COLUMN district_id INT NULL AFTER state_id',
  'SELECT ''users.district_id already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'fk_users_district') = 0,
  'ALTER TABLE users ADD KEY fk_users_district (district_id)',
  'SELECT ''users district index already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @migration_sql = IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'users' AND constraint_name = 'fk_users_district') = 0,
  'ALTER TABLE users ADD CONSTRAINT fk_users_district FOREIGN KEY (district_id) REFERENCES districts(district_id)',
  'SELECT ''users district foreign key already exists'''
);
PREPARE migration_stmt FROM @migration_sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

-- Populate districts only from the official, regularly updated Local
-- Government Directory (LGD) dataset; do not infer or hardcode district names.
-- Source: https://data.gov.in/resource/local-government-directory-lgd-districts
-- The current districts table remains empty until that source is imported.
