-- Repair/complete India's 28 States and 8 Union Territories without changing
-- existing state IDs or any non-India state/country relationships.
-- Apply after migration_001_security_profile.sql and migration_002_profile_geography.sql.
-- Source: Government of India, Local Government Directory (LGD), States;
-- https://data.gov.in/catalog/local-government-directory-lgd
USE one_tap;

INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Andhra Pradesh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Andhra Pradesh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Arunachal Pradesh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Arunachal Pradesh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Assam', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Assam');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Bihar', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Bihar');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Chhattisgarh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Chhattisgarh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Goa', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Goa');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Gujarat', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Gujarat');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Haryana', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Haryana');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Himachal Pradesh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Himachal Pradesh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Jharkhand', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Jharkhand');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Karnataka', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Karnataka');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Kerala', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Kerala');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Madhya Pradesh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Madhya Pradesh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Maharashtra', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Maharashtra');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Manipur', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Manipur');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Meghalaya', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Meghalaya');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Mizoram', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Mizoram');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Nagaland', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Nagaland');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Odisha', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Odisha');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Punjab', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Punjab');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Rajasthan', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Rajasthan');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Sikkim', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Sikkim');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Tamil Nadu', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Tamil Nadu');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Telangana', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Telangana');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Tripura', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Tripura');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Uttar Pradesh', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Uttar Pradesh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Uttarakhand', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Uttarakhand');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'West Bengal', 'State' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='West Bengal');

INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Andaman and Nicobar Islands', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Andaman and Nicobar Islands');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Chandigarh', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Chandigarh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Dadra and Nagar Haveli and Daman and Diu', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Dadra and Nagar Haveli and Daman and Diu');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Delhi', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Delhi');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Jammu and Kashmir', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Jammu and Kashmir');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Ladakh', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Ladakh');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Lakshadweep', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Lakshadweep');
INSERT INTO states (country_id, state_name, region_type)
SELECT 1, 'Puducherry', 'Union Territory' WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id=1 AND state_name='Puducherry');

UPDATE states SET region_type='State'
WHERE country_id=1 AND state_name IN (
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
);
UPDATE states SET region_type='Union Territory'
WHERE country_id=1 AND state_name IN (
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi',
  'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
);

-- District rows are imported separately from the current monthly LGD Districts
-- CSV. The OGD file endpoint rejects automated access in some environments;
-- see the database import instructions for the official resource and procedure.
