import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/trusted-contact")
public class TrustedContactServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        if (!Security.requireUser(request, response)) return;

        int userId = Security.userId(request);

        String contactName =
                request.getParameter("contactName");

        String phoneNumber =
                request.getParameter("phoneNumber");

        String relationship =
                request.getParameter("relationship");

        TrustedContact contact = new TrustedContact(
                userId,
                contactName,
                phoneNumber,
                relationship
        );

        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        boolean success =
                contactDAO.addTrustedContact(contact);

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (wantJson) {
            response.setContentType("application/json");
            if (success) {
                response.getWriter().println("{\"status\":\"success\",\"message\":\"Trusted contact added successfully!\"}");
            } else {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().println("{\"status\":\"error\",\"message\":\"Failed to add trusted contact.\"}");
            }
        } else {
            response.setContentType("text/plain");
            if (success) {
                response.getWriter().println("Trusted contact added successfully!");
            } else {
                response.getWriter().println("Failed to add trusted contact.");
            }
        }
    }
}
