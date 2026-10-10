import java.sql.*;
import java.util.*;

public class SOSAlertDAO {
    public record Recipient(String type, Integer trustedContactId, String name, String phone,
                            String normalizedPhone, String initialStatus) {}
    public record Notification(int id, String type, String name, String phone, String messageBody,
                               String deliveryStatus, String providerStatus, String voiceStatus, int retryCount) {}
    public record Alert(int id, boolean duplicate, List<Notification> notifications) {}
    public record RetryClaim(int alertId, List<Integer> claimedIds, List<Notification> notifications) {}

    public Alert createAlert(SOSAlert alert, String requestKey, List<Recipient> recipients, String messageBody) throws SQLException {
        int userId = alert.getUserId();
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            c.setAutoCommit(false);
            try {
                try (PreparedStatement lock = c.prepareStatement("SELECT user_id FROM users WHERE user_id=? FOR UPDATE")) {
                    lock.setInt(1, userId);
                    try (ResultSet rs = lock.executeQuery()) { if (!rs.next()) throw new SQLException("User not found."); }
                }
                try (PreparedStatement existing = c.prepareStatement("SELECT alert_id FROM sos_alerts WHERE user_id=? AND request_key=?")) {
                    existing.setInt(1, userId); existing.setString(2, requestKey);
                    try (ResultSet rs = existing.executeQuery()) {
                        if (rs.next()) {
                            int id = rs.getInt(1); c.commit();
                            return new Alert(id, true, getNotifications(c, id));
                        }
                    }
                }
                try (PreparedStatement rate = c.prepareStatement("SELECT alert_id FROM sos_alerts WHERE user_id=? AND alert_time >= DATE_SUB(NOW(), INTERVAL 30 SECOND) ORDER BY alert_time DESC LIMIT 1")) {
                    rate.setInt(1, userId);
                    try (ResultSet rs = rate.executeQuery()) {
                        if (rs.next()) throw new RateLimitException("Please wait before starting another SOS alert. Retry the existing alert if its result is uncertain.");
                    }
                }
                int alertId;
                try (PreparedStatement insert = c.prepareStatement(
                        "INSERT INTO sos_alerts (user_id,latitude,longitude,accuracy_m,status,dispatch_status,request_key) VALUES (?,?,?,?,?,'PENDING',?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    insert.setInt(1, userId); nullableDouble(insert, 2, alert.getLatitude()); nullableDouble(insert, 3, alert.getLongitude());
                    nullableDouble(insert, 4, alert.getAccuracy()); insert.setString(5, alert.getStatus()); insert.setString(6, requestKey);
                    insert.executeUpdate();
                    try (ResultSet keys = insert.getGeneratedKeys()) { if (!keys.next()) throw new SQLException("Could not create SOS event."); alertId = keys.getInt(1); }
                }
                String sql = "INSERT INTO sos_notifications (alert_id,recipient_type,trusted_contact_id,recipient_name,phone_number,message_body,delivery_status,provider_status) VALUES (?,?,?,?,?,?,?,?)";
                try (PreparedStatement insert = c.prepareStatement(sql)) {
                    for (Recipient r : recipients) {
                        insert.setInt(1, alertId); insert.setString(2, r.type());
                        if (r.trustedContactId() == null) insert.setNull(3, Types.INTEGER); else insert.setInt(3, r.trustedContactId());
                        insert.setString(4, r.name()); insert.setString(5, r.normalizedPhone() == null ? r.phone() : r.normalizedPhone());
                        insert.setString(6, messageBody);
                        insert.setString(7, r.normalizedPhone() == null ? "FAILED" : "PENDING");
                        insert.setString(8, r.normalizedPhone() == null ? "INVALID_PHONE" : "PENDING"); insert.addBatch();
                    }
                    insert.executeBatch();
                }
                c.commit();
                return new Alert(alertId, false, getNotifications(c, alertId));
            } catch (RateLimitException e) {
                c.rollback(); throw e;
            } catch (SQLIntegrityConstraintViolationException e) {
                c.rollback();
                try (PreparedStatement existing = c.prepareStatement("SELECT alert_id FROM sos_alerts WHERE user_id=? AND request_key=?")) {
                    existing.setInt(1, userId); existing.setString(2, requestKey);
                    try (ResultSet rs = existing.executeQuery()) { if (rs.next()) return new Alert(rs.getInt(1), true, getNotifications(c, rs.getInt(1))); }
                }
                throw e;
            } catch (SQLException | RuntimeException e) { c.rollback(); throw e; }
        }
    }

    public List<Notification> getNotifications(Connection c, int alertId) throws SQLException {
        List<Notification> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement("SELECT notification_id,recipient_type,recipient_name,phone_number,message_body,provider_status,delivery_status,voice_status,retry_count FROM sos_notifications WHERE alert_id=? ORDER BY notification_id")) {
            s.setInt(1, alertId);
                try (ResultSet r = s.executeQuery()) { while (r.next()) rows.add(new Notification(r.getInt(1), r.getString(2), r.getString(3), r.getString(4), r.getString(5), r.getString(7), r.getString(6), r.getString(8), r.getInt(9))); }
        }
        return rows;
    }

    public List<Notification> getNotifications(int alertId) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            return getNotifications(c, alertId);
        }
    }

    /** Atomically claims only clearly failed/not-sent SMS rows; uncertain or accepted rows are never retried. */
    public RetryClaim claimRetryableNotifications(int userId, String requestKey) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            c.setAutoCommit(false);
            try {
                int alertId;
                try (PreparedStatement find = c.prepareStatement("SELECT alert_id FROM sos_alerts WHERE user_id=? AND request_key=? FOR UPDATE")) {
                    find.setInt(1, userId); find.setString(2, requestKey);
                    try (ResultSet r = find.executeQuery()) { if (!r.next()) { c.rollback(); return null; } alertId = r.getInt(1); }
                }
                List<Integer> claimed = new ArrayList<>();
                try (PreparedStatement find = c.prepareStatement("SELECT notification_id FROM sos_notifications WHERE alert_id=? AND delivery_status IN ('FAILED','NOT_SENT') AND provider_status IN ('REJECTED','DISABLED','CONFIGURATION_ERROR','undelivered','failed','canceled') AND retry_count<2 ORDER BY notification_id FOR UPDATE")) {
                    find.setInt(1, alertId);
                    try (ResultSet r = find.executeQuery()) { while (r.next()) claimed.add(r.getInt(1)); }
                }
                try (PreparedStatement update = c.prepareStatement("UPDATE sos_notifications SET provider_status='RETRYING',delivery_status='PENDING',retry_count=retry_count+1 WHERE notification_id=?")) {
                    for (Integer id : claimed) { update.setInt(1, id); update.addBatch(); }
                    if (!claimed.isEmpty()) update.executeBatch();
                }
                c.commit();
                return new RetryClaim(alertId, claimed, getNotifications(c, alertId));
            } catch (SQLException e) { c.rollback(); throw e; }
        }
    }

    public void setProviderResult(int notificationId, String providerStatus, String deliveryStatus, String sid) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            try (PreparedStatement s = c.prepareStatement("UPDATE sos_notifications SET provider_status=?,delivery_status=?,provider_message_id=? WHERE notification_id=?")) {
                s.setString(1, providerStatus); s.setString(2, deliveryStatus); s.setString(3, sid); s.setInt(4, notificationId);
                if (s.executeUpdate() != 1) throw new SQLException("Notification record not found.");
            }
        }
    }

    public void setVoiceResult(int notificationId, String providerStatus, String sid) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            try (PreparedStatement s = c.prepareStatement("UPDATE sos_notifications SET voice_status=?,voice_call_sid=? WHERE notification_id=?")) {
                s.setString(1, providerStatus); s.setString(2, sid); s.setInt(3, notificationId);
                if (s.executeUpdate() != 1) throw new SQLException("Notification record not found.");
            }
        }
    }

    public void finishAlert(int alertId) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            try (PreparedStatement s = c.prepareStatement("UPDATE sos_alerts SET dispatch_status=(SELECT CASE WHEN SUM(delivery_status IN ('QUEUED','PENDING'))>0 THEN 'PENDING' WHEN SUM(delivery_status='UNKNOWN')>0 THEN 'UNKNOWN' WHEN SUM(delivery_status='FAILED')>0 AND SUM(delivery_status='DELIVERED')>0 THEN 'PARTIAL' WHEN SUM(delivery_status='FAILED')>0 THEN 'FAILED' WHEN SUM(delivery_status='DELIVERED')>0 THEN 'DELIVERED' WHEN SUM(delivery_status='MOCKED')>0 THEN 'TEST_MODE' ELSE 'FAILED' END FROM sos_notifications WHERE alert_id=?) WHERE alert_id=?")) {
                s.setInt(1, alertId); s.setInt(2, alertId); s.executeUpdate();
            }
        }
    }

    public boolean updateDeliveryStatus(int notificationId, String sid, String providerStatus, String deliveryStatus) throws SQLException {
        int alertId;
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            try (PreparedStatement find = c.prepareStatement("SELECT alert_id FROM sos_notifications WHERE notification_id=? AND provider_message_id=?")) {
                find.setInt(1, notificationId); find.setString(2, sid);
                try (ResultSet r = find.executeQuery()) { if (!r.next()) return false; alertId = r.getInt(1); }
            }
            try (PreparedStatement s = c.prepareStatement("UPDATE sos_notifications SET provider_status=?,delivery_status=? WHERE notification_id=? AND provider_message_id=?")) {
                s.setString(1, providerStatus); s.setString(2, deliveryStatus); s.setInt(3, notificationId); s.setString(4, sid);
                if (s.executeUpdate() != 1) return false;
            }
        }
        finishAlert(alertId);
        return true;
    }

    private static void nullableDouble(PreparedStatement s, int column, Double v) throws SQLException {
        if (v == null) s.setNull(column, Types.DECIMAL); else s.setDouble(column, v);
    }

    public static final class RateLimitException extends SQLException {
        public RateLimitException(String message) { super(message); }
    }
}
