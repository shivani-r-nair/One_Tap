import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

@WebServlet("/trusted-contacts")
public class GetTrustedContactsServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        String userIdParameter =
                request.getParameter("userId");

        if (userIdParameter == null) {
            response.setContentType("text/plain");
            response.getWriter().println(
                    "User ID is required."
            );
            return;
        }

        int userId = Integer.parseInt(userIdParameter);

        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        List<TrustedContact> contacts =
                contactDAO.getTrustedContacts(userId);

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (wantJson) {
            response.setContentType("application/json");
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < contacts.size(); i++) {
                TrustedContact c = contacts.get(i);
                sb.append("{")
                  .append("\"userId\":").append(c.getUserId()).append(",")
                  .append("\"contactName\":\"").append(escapeJson(c.getContactName())).append("\",")
                  .append("\"phoneNumber\":\"").append(escapeJson(c.getPhoneNumber())).append("\",")
                  .append("\"relationship\":\"").append(escapeJson(c.getRelationship())).append("\"")
                  .append("}");
                if (i < contacts.size() - 1) sb.append(",");
            }
            sb.append("]");
            response.getWriter().println(sb.toString());
        } else {
            response.setContentType("text/plain");
            if (contacts.isEmpty()) {
                response.getWriter().println("No trusted contacts found.");
            } else {
                response.getWriter().println("Trusted Contacts:");
                for (TrustedContact contact : contacts) {
                    response.getWriter().println(
                            contact.getContactName() + " - " +
                            contact.getPhoneNumber() + " - " +
                            contact.getRelationship()
                    );
                }
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}