-- Safe, additive SOS delivery log and idempotency migration. Existing alert/contact
-- rows and emergency helpline records are preserved.
USE one_tap;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sos_alerts' AND column_name='accuracy_m')=0,
  'ALTER TABLE sos_alerts ADD COLUMN accuracy_m DECIMAL(9,2) NULL',
  'SELECT ''sos_alerts.accuracy_m already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sos_alerts' AND column_name='dispatch_status')=0,
  'ALTER TABLE sos_alerts ADD COLUMN dispatch_status VARCHAR(40) NOT NULL DEFAULT ''PENDING''',
  'SELECT ''sos_alerts.dispatch_status already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sos_alerts' AND column_name='request_key')=0,
  'ALTER TABLE sos_alerts ADD COLUMN request_key VARCHAR(64) NULL',
  'SELECT ''sos_alerts.request_key already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='sos_alerts' AND index_name='uq_sos_user_request')=0,
  'CREATE UNIQUE INDEX uq_sos_user_request ON sos_alerts(user_id,request_key)',
  'SELECT ''uq_sos_user_request already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

CREATE TABLE IF NOT EXISTS sos_notifications (
  notification_id INT NOT NULL AUTO_INCREMENT,
  alert_id INT NOT NULL,
  recipient_type VARCHAR(20) NOT NULL,
  trusted_contact_id INT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  message_body TEXT NULL,
  provider_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  voice_status VARCHAR(40) NOT NULL DEFAULT 'NOT_SENT',
  voice_call_sid VARCHAR(80) NULL,
  retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  provider_message_id VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  UNIQUE KEY uq_sos_notification_alert_phone (alert_id,phone_number),
  KEY ix_sos_notification_provider_id (provider_message_id),
  CONSTRAINT fk_sos_notification_alert FOREIGN KEY (alert_id) REFERENCES sos_alerts(alert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sos_notifications' AND column_name='retry_count')=0,
  'ALTER TABLE sos_notifications ADD COLUMN retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT ''sos_notifications.retry_count already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sos_notifications' AND column_name='message_body')=0,
  'ALTER TABLE sos_notifications ADD COLUMN message_body TEXT NULL',
  'SELECT ''sos_notifications.message_body already exists'''
);
PREPARE migration_stmt FROM @sql; EXECUTE migration_stmt; DEALLOCATE PREPARE migration_stmt;
