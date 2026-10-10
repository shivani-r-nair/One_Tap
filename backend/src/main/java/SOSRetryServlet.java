import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import java.util.*;

/** Retries only notifications known to have failed or never been submitted. */
@WebServlet("/sos-retry")
public class SOSRetryServlet extends SOSServlet {
    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
        if (!Security.requireUser(req,res)) return;
        String requestId = req.getParameter("requestId");
        if (requestId == null || !requestId.matches("[A-Fa-f0-9-]{36}")) {
            Security.json(res,400,"{\"status\":\"error\",\"message\":\"Invalid request ID.\"}"); return;
        }
        SOSAlertDAO dao = alertDao();
        try {
            SOSAlertDAO.RetryClaim claim = dao.claimRetryableNotifications(Security.userId(req),requestId);
            if (claim == null) { Security.json(res,404,"{\"status\":\"error\",\"message\":\"SOS event not found.\"}"); return; }
            Map<Integer,SOSAlertDAO.Notification> byId = new HashMap<>();
            for (SOSAlertDAO.Notification row : claim.notifications()) byId.put(row.id(),row);
            for (Integer id : claim.claimedIds()) {
                SOSAlertDAO.Notification row=byId.get(id);
                if (row==null || row.messageBody()==null) continue;
                TwilioCallService.SmsSubmission sent=submitSms(row.phone(),row.messageBody(),id);
                try { dao.setProviderResult(id,sent.providerStatus(),sent.deliveryStatus(),sent.messageSid()); }
                catch (SQLException e) { /* The retry claim remains pending and cannot be sent again automatically. */ }
            }
            try { dao.finishAlert(claim.alertId()); } catch (SQLException ignored) { }
            writeResult(res,claim.alertId(),true,"RECORDED",
                    claim.claimedIds().isEmpty()?"No retryable failed SMS remained. Accepted or uncertain notifications were not resent.":"Only known failed/not-sent SMS notifications were retried. Accepted or uncertain notifications were not resent.",
                    dao.getNotifications(claim.alertId()));
        } catch (SQLException e) {
            Security.json(res,503,"{\"status\":\"error\",\"message\":\"Retry status could not be recorded. No additional SMS was sent.\"}");
        }
    }
}
