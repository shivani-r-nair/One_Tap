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

        if (!alertCreated) {

            response.getWriter().println(
                    "Failed to create SOS alert."
            );

            return;
        }

        // Get ALL trusted contacts
        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        List<TrustedContact> contacts =
                contactDAO.getTrustedContacts(userId);

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