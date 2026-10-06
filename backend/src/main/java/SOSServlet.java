import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

@WebServlet("/sos")
public class SOSServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request,
                           HttpServletResponse response)
            throws ServletException, IOException {

        String userIdParameter =
                request.getParameter("userId");

        String latitudeParameter =
                request.getParameter("latitude");

        String longitudeParameter =
                request.getParameter("longitude");

        response.setContentType("text/plain");

        if (userIdParameter == null ||
            latitudeParameter == null ||
            longitudeParameter == null) {

            response.getWriter().println(
                    "User ID, latitude and longitude are required."
            );

            return;
        }

        int userId =
                Integer.parseInt(userIdParameter);

        double latitude =
                Double.parseDouble(latitudeParameter);

        double longitude =
                Double.parseDouble(longitudeParameter);

        // Create SOS alert
        SOSAlert alert = new SOSAlert(
                userId,
                latitude,
                longitude,
                "ACTIVE"
        );

        SOSAlertDAO alertDAO =
                new SOSAlertDAO();

        boolean alertCreated =
                alertDAO.createAlert(alert);

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (!alertCreated) {
            if (wantJson) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType("application/json");
                response.getWriter().println("{\"status\":\"error\",\"message\":\"Failed to create SOS alert.\"}");
            } else {
                response.getWriter().println("Failed to create SOS alert.");
            }
            return;
        }

        // Get ALL trusted contacts
        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        List<TrustedContact> contacts =
                contactDAO.getTrustedContacts(userId);

        if (wantJson) {
            response.setContentType("application/json");
            StringBuilder callsJson = new StringBuilder("[");
            for (int i = 0; i < contacts.size(); i++) {
                TrustedContact contact = contacts.get(i);
                boolean callSent = false;
                try {
                    TwilioCallService.makeCall(contact.getPhoneNumber());
                    callSent = true;
                } catch (Exception e) {
                    e.printStackTrace();
                }
                callsJson.append("{")
                    .append("\"contactName\":\"").append(escapeJson(contact.getContactName())).append("\",")
                    .append("\"phoneNumber\":\"").append(escapeJson(contact.getPhoneNumber())).append("\",")
                    .append("\"callSent\":").append(callSent)
                    .append("}");
                if (i < contacts.size() - 1) callsJson.append(",");
            }
            callsJson.append("]");

            response.getWriter().println(
                "{\"status\":\"success\"," +
                "\"message\":\"SOS alert created successfully!\"," +
                "\"userId\":" + userId + "," +
                "\"latitude\":" + latitude + "," +
                "\"longitude\":" + longitude + "," +
                "\"contactsAlerted\":" + contacts.size() + "," +
                "\"calls\":" + callsJson.toString() + "}"
            );
        } else {
            response.getWriter().println(
                    "SOS alert created successfully!"
            );

            response.getWriter().println(
                    "Trusted contacts to alert: " +
                    contacts.size()
            );

            // Call every trusted contact
            for (TrustedContact contact : contacts) {

                response.getWriter().println(
                        "Calling: " +
                        contact.getContactName() +
                        " - " +
                        contact.getPhoneNumber()
                );

                try {

                    TwilioCallService.makeCall(
                            contact.getPhoneNumber()
                    );

                    response.getWriter().println(
                            "Call request sent successfully."
                    );

                } catch (Exception e) {

                    response.getWriter().println(
                            "Failed to call " +
                            contact.getContactName()
                    );

                    e.printStackTrace();
                }
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}