import com.twilio.security.RequestValidator;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;

/** Optional Twilio delivery receipt endpoint. Requests are accepted only after signature validation. */
@WebServlet("/twilio-sms-status")
public class TwilioSmsStatusServlet extends HttpServlet {
    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        String token = System.getenv("TWILIO_AUTH_TOKEN");
        String baseUrl = System.getenv("TWILIO_STATUS_CALLBACK_URL");
        String signature = req.getHeader("X-Twilio-Signature");
        String idText = req.getParameter("notificationId");
        if (token == null || token.isBlank() || baseUrl == null || baseUrl.isBlank() || signature == null || idText == null) {
            Security.json(res, 403, "{\"status\":\"error\",\"message\":\"Webhook validation is not configured.\"}"); return;
        }
        try {
            int notificationId = Integer.parseInt(idText);
            String separator = baseUrl.contains("?") ? "&" : "?";
            String exactUrl = baseUrl + separator + "notificationId=" + idText;
            Map<String, String> params = new HashMap<>();
            req.getParameterMap().forEach((key, values) -> {
                if (!key.equals("notificationId") && values != null && values.length > 0) params.put(key, values[0]);
            });
            if (!new RequestValidator(token).validate(exactUrl, params, signature)) {
                Security.json(res, 403, "{\"status\":\"error\",\"message\":\"Invalid webhook signature.\"}"); return;
            }
            String sid = req.getParameter("MessageSid"), rawStatus = req.getParameter("MessageStatus");
            if (sid == null || rawStatus == null) { Security.json(res, 400, "{\"status\":\"error\",\"message\":\"Missing delivery status fields.\"}"); return; }
            String normalized = rawStatus.toLowerCase(Locale.ROOT);
            if (!Set.of("accepted", "scheduled", "queued", "sending", "sent", "delivered", "undelivered", "failed", "canceled").contains(normalized)) {
                Security.json(res, 400, "{\"status\":\"error\",\"message\":\"Unknown delivery status.\"}"); return;
            }
            String delivery = normalized.equals("delivered") ? "DELIVERED"
                    : Set.of("undelivered", "failed", "canceled").contains(normalized) ? "FAILED" : "QUEUED";
            SOSAlertDAO dao = new SOSAlertDAO();
            if (!dao.updateDeliveryStatus(notificationId, sid, normalized, delivery)) {
                Security.json(res, 404, "{\"status\":\"error\",\"message\":\"Notification was not found.\"}"); return;
            }
            Security.json(res, 200, "{\"status\":\"success\"}");
        } catch (Exception e) {
            Security.json(res, 400, "{\"status\":\"error\",\"message\":\"Delivery receipt could not be processed.\"}");
        }
    }
}
