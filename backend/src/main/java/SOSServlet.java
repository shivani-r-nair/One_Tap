import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.*;
import java.util.*;

@WebServlet("/sos")
public class SOSServlet extends HttpServlet {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_ADDITIONAL_RECIPIENTS = 5;

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
        if (!Security.requireUser(req, res)) return;
        int userId = Security.userId(req);
        String requestKey = value(req, "requestId");
        if (!requestKey.matches("[A-Fa-f0-9-]{36}")) { json(res, 400, "Invalid request ID."); return; }

        Double requestedLat = number(req, "latitude"), requestedLng = number(req, "longitude"), requestedAccuracy = number(req, "accuracy");
        boolean hasLat = !value(req, "latitude").isEmpty(), hasLng = !value(req, "longitude").isEmpty();
        if (hasLat != hasLng || (hasLat && (requestedLat == null || requestedLng == null)) ||
                (requestedAccuracy == null && !value(req, "accuracy").isEmpty()) ||
                !validLocation(requestedLat, requestedLng, requestedAccuracy)) {
            json(res, 400, "Invalid location data."); return;
        }

        String mode = value(req, "recipientMode").toUpperCase(Locale.ROOT);
        if (!mode.equals("TRUSTED") && !mode.equals("ADDITIONAL")) { json(res, 400, "Unknown recipient mode."); return; }
        try {
            ProfileLocation saved = readProfile(userId);
            Double lat = requestedLat != null ? requestedLat : saved.latitude;
            Double lng = requestedLng != null ? requestedLng : saved.longitude;
            Double accuracy = requestedAccuracy != null ? requestedAccuracy : saved.accuracy;
            String source = requestedLat != null ? "CURRENT" : lat != null ? "PROFILE_SAVED" : "UNAVAILABLE";
            List<SOSAlertDAO.Recipient> recipients = mode.equals("TRUSTED")
                    ? trustedRecipients(userId)
                    : additionalRecipients(req.getParameter("additionalRecipients"));
            if (mode.equals("ADDITIONAL") && recipients.isEmpty()) { json(res, 400, "Select at least one additional recipient."); return; }

            String extraMessage = mode.equals("ADDITIONAL") ? value(req, "message") : "";
            if (extraMessage.length() > 500) { json(res, 400, "Message must be 500 characters or fewer."); return; }
            String message = buildMessage(saved.name, saved.address, saved.locality, lat, lng, source, extraMessage);
            SOSAlertDAO dao = alertDao();
            SOSAlertDAO.Alert alert;
            try { alert = dao.createAlert(new SOSAlert(userId, lat, lng, accuracy, "ACTIVE"), requestKey, recipients, message); }
            catch (SOSAlertDAO.RateLimitException e) { json(res, 429, e.getMessage()); return; }

            if (!alert.duplicate()) {
                for (SOSAlertDAO.Notification notification : alert.notifications()) {
                    if (!notification.deliveryStatus().equals("PENDING")) continue;
                    TwilioCallService.SmsSubmission submission = submitSms(
                            notification.phone(), message, notification.id());
                    try { dao.setProviderResult(notification.id(), submission.providerStatus(),
                            submission.deliveryStatus(), submission.messageSid()); }
                    catch (SQLException e) { /* The committed PENDING row prevents a retry from duplicating an SMS. */ }
                    if (notification.type().equals("TRUSTED")) {
                        TwilioCallService.CallSubmission call = submitVoice(notification.phone());
                        try { dao.setVoiceResult(notification.id(), call.providerStatus(), call.callSid()); }
                        catch (SQLException e) { /* Voice result persistence must not re-send an alert. */ }
                    }
                }
                try { dao.finishAlert(alert.id()); } catch (SQLException ignored) { }
            }
            List<SOSAlertDAO.Notification> results = dao.getNotifications(alert.id());
            String messageText = alert.duplicate() ? "This SOS request was already processed; no duplicate SMS was sent."
                    : results.isEmpty() ? "SOS event recorded. No trusted contacts are saved for automatic SMS alerts."
                    : "SOS event recorded. Provider acceptance is not confirmation of SMS delivery.";
            writeResult(res, alert.id(), alert.duplicate(), source, messageText, results);
        } catch (SOSAlertDAO.RateLimitException e) {
            json(res, 429, e.getMessage());
        } catch (SQLException e) {
            json(res, 503, "SOS could not be recorded or contacts could not be loaded. No new SMS was sent.");
        } catch (Exception e) {
            json(res, 400, "Invalid SOS request.");
        }
    }

    protected List<SOSAlertDAO.Recipient> trustedRecipients(int userId) throws SQLException {
        List<SOSAlertDAO.Recipient> rows = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (TrustedContact contact : loadTrustedContacts(userId)) {
            addRecipient(rows, seen, "TRUSTED", contact.getContactId(), contact.getContactName(), contact.getPhoneNumber());
        }
        return rows;
    }

    private static List<SOSAlertDAO.Recipient> additionalRecipients(String encoded) throws Exception {
        JsonNode input = JSON.readTree(encoded == null ? "[]" : encoded);
        if (input == null || !input.isArray() || input.size() > MAX_ADDITIONAL_RECIPIENTS)
            throw new IllegalArgumentException("Invalid additional recipients.");
        List<SOSAlertDAO.Recipient> rows = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (JsonNode item : input) {
            String name = item.path("name").asText("").trim();
            String phone = item.path("phone").asText("").trim();
            if (name.isEmpty()) name = "Additional contact";
            if (name.length() > 100 || phone.length() > 30) throw new IllegalArgumentException("Invalid contact details.");
            addRecipient(rows, seen, "ADDITIONAL", null, name, phone);
        }
        return rows;
    }

    private static void addRecipient(List<SOSAlertDAO.Recipient> rows, Set<String> seen, String type,
                                     Integer id, String name, String rawPhone) {
        String raw = rawPhone == null ? "" : rawPhone;
        String normalized = PhoneNumberNormalizer.normalize(raw);
        String key = normalized == null ? "INVALID:" + raw.replaceAll("[^0-9]", "") : normalized;
        if (key.equals("INVALID:")) key += UUID.randomUUID();
        String storedPhone = raw.isBlank() ? "MISSING-" + UUID.randomUUID().toString().substring(0, 8) : raw;
        if (seen.add(key)) rows.add(new SOSAlertDAO.Recipient(type, id, name == null ? "Contact" : name,
                storedPhone, normalized, normalized == null ? "INVALID_PHONE" : "PENDING"));
    }

    protected ProfileLocation readProfile(int userId) throws SQLException {
        String sql = "SELECT full_name,locality,address,latitude,longitude,accuracy_m FROM users WHERE user_id=?";
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database unavailable.");
            try (PreparedStatement s = c.prepareStatement(sql)) {
                s.setInt(1, userId);
                try (ResultSet r = s.executeQuery()) {
                    if (!r.next()) throw new SQLException("User not found.");
                    return new ProfileLocation(r.getString("full_name"), r.getString("address"), r.getString("locality"),
                            nullableDouble(r, "latitude"), nullableDouble(r, "longitude"), nullableDouble(r, "accuracy_m"));
                }
            }
        }
    }

    protected List<TrustedContact> loadTrustedContacts(int userId) throws SQLException {
        return new TrustedContactDAO().getTrustedContactsStrict(userId);
    }
    protected SOSAlertDAO alertDao() { return new SOSAlertDAO(); }
    protected TwilioCallService.SmsSubmission submitSms(String phone, String message, int notificationId) {
        return TwilioCallService.sendSms(phone, message, notificationId);
    }
    protected TwilioCallService.CallSubmission submitVoice(String phone) {
        return TwilioCallService.makeCallForAlert(phone);
    }

    private static String buildMessage(String name, String address, String locality, Double lat, Double lng, String source, String extra) {
        StringBuilder b = new StringBuilder("EMERGENCY ALERT from One Tap. ")
                .append(name == null || name.isBlank() ? "The user" : name).append(" may need immediate assistance.");
        if (!extra.isBlank()) b.append(" Message: ").append(extra.trim());
        String readable = String.join(", ", Arrays.stream(new String[]{address, locality}).filter(s -> s != null && !s.isBlank()).distinct().toList());
        if (!readable.isBlank()) b.append(source.equals("PROFILE_SAVED") ? " Last saved location (may be older): " : " Last known location: ").append(readable).append('.');
        if (lat != null && lng != null && validLocation(lat, lng, null))
            b.append(" Location link: https://maps.google.com/?q=").append(lat).append(',').append(lng).append('.');
        else b.append(" GPS location is unavailable.");
        return b.append(" Please contact them and arrange appropriate assistance.").toString();
    }

    protected static void writeResult(HttpServletResponse res, int alertId, boolean duplicate, String source,
                                    String text, List<SOSAlertDAO.Notification> rows) throws IOException {
        StringBuilder b = new StringBuilder("{\"status\":\"success\",\"alertId\":").append(alertId)
                .append(",\"duplicate\":").append(duplicate).append(",\"locationSource\":").append(Security.quote(source))
                .append(",\"recipientCount\":").append(rows.size())
                .append(",\"message\":").append(Security.quote(text)).append(",\"notifications\":[");
        for (int i = 0; i < rows.size(); i++) {
            SOSAlertDAO.Notification n = rows.get(i);
            if (i > 0) b.append(',');
            b.append("{\"notificationId\":").append(n.id())
                    .append(",\"name\":").append(Security.quote(n.name())).append(",\"phone\":").append(Security.quote(maskPhone(n.phone())))
                    .append(",\"status\":").append(Security.quote(notificationStatus(n)))
                    .append(",\"reason\":").append(Security.quote(notificationReason(n)))
                    .append(",\"deliveryConfirmed\":").append(n.deliveryStatus().equalsIgnoreCase("DELIVERED"))
                    .append(",\"type\":").append(Security.quote(n.type())).append(",\"deliveryStatus\":").append(Security.quote(n.deliveryStatus()))
                    .append(",\"providerStatus\":").append(Security.quote(n.providerStatus()))
                    .append(",\"voiceStatus\":").append(Security.quote(n.voiceStatus()))
                    .append(",\"retryCount\":").append(n.retryCount())
                    .append(",\"retryAvailable\":").append(retryAvailable(n)).append('}');
        }
        Security.json(res, 200, b.append("]}").toString());
    }

    private static String notificationStatus(SOSAlertDAO.Notification n) {
        return switch (n.deliveryStatus().toUpperCase(Locale.ROOT)) {
            case "DELIVERED" -> "delivered";
            case "QUEUED" -> "accepted";
            case "FAILED" -> "failed";
            case "NOT_SENT", "MOCKED" -> "not_attempted";
            case "UNKNOWN" -> "unknown";
            default -> "pending";
        };
    }

    private static String notificationReason(SOSAlertDAO.Notification n) {
        String provider = n.providerStatus() == null ? "" : n.providerStatus().toUpperCase(Locale.ROOT);
        return switch (n.deliveryStatus().toUpperCase(Locale.ROOT)) {
            case "DELIVERED" -> "Delivery confirmed by provider receipt.";
            case "QUEUED" -> "Provider accepted the SMS request; delivery is not confirmed.";
            case "MOCKED" -> "Test mode is active; no SMS was sent.";
            case "NOT_SENT" -> provider.equals("DISABLED") ? "SMS sending is disabled by configuration." : "SMS was not submitted to the provider.";
            case "FAILED" -> provider.equals("INVALID_PHONE") ? "Phone number must include a valid international country code." :
                    provider.equals("CONFIGURATION_ERROR") ? "SMS provider configuration is incomplete." :
                    provider.equals("REJECTED") ? "SMS provider rejected the request." : "SMS submission failed.";
            case "UNKNOWN" -> "Provider outcome is uncertain; delivery is not confirmed.";
            default -> "SMS processing is pending; delivery is not confirmed.";
        };
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.startsWith("MISSING-")) return "unavailable";
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return "unavailable";
        int visible = Math.min(4, digits.length());
        return "*".repeat(Math.max(4, digits.length() - visible)) + digits.substring(digits.length() - visible);
    }

    protected static boolean retryAvailable(SOSAlertDAO.Notification n) {
        return n.retryCount() < 2 && Set.of("FAILED", "NOT_SENT").contains(n.deliveryStatus()) &&
                Set.of("REJECTED", "DISABLED", "CONFIGURATION_ERROR", "undelivered", "failed", "canceled").contains(n.providerStatus());
    }

    private static boolean validLocation(Double lat, Double lng, Double accuracy) {
        return (lat == null && lng == null || lat != null && lng != null && Double.isFinite(lat) && Double.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
                && (accuracy == null || Double.isFinite(accuracy) && accuracy >= 0);
    }
    private static Double number(HttpServletRequest r, String k) { try { String s=value(r,k); return s.isBlank()?null:Double.valueOf(s); } catch (Exception e) { return null; } }
    private static Double nullableDouble(ResultSet r, String k) throws SQLException { double v=r.getDouble(k);return r.wasNull()?null:v; }
    private static String value(HttpServletRequest r, String k) { String v=r.getParameter(k);return v==null?"":v.trim(); }
    private static void json(HttpServletResponse r, int status, String msg) throws IOException { Security.json(r,status,"{\"status\":\"error\",\"message\":"+Security.quote(msg)+"}"); }
    protected record ProfileLocation(String name, String address, String locality, Double latitude, Double longitude, Double accuracy) { }
}
