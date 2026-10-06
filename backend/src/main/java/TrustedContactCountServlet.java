import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/trusted-contact-count")
public class TrustedContactCountServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        String userIdParameter =
                request.getParameter("userId");

        response.setContentType("text/plain");

        if (userIdParameter == null) {
            response.getWriter().println(
                    "User ID is required."
            );
            return;
        }

        int userId = Integer.parseInt(userIdParameter);

        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        int count =
                contactDAO.getTrustedContactCount(userId);

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (wantJson) {
            response.setContentType("application/json");
            response.getWriter().println(
                "{\"status\":\"success\"," +
                "\"userId\":" + userId + "," +
                "\"count\":" + count + "," +
                "\"required\":5," +
                "\"satisfied\":" + (count >= 5) + "," +
                "\"remaining\":" + Math.max(0, 5 - count) + "}"
            );
        } else {
            response.getWriter().println(
                    "Trusted Contact Count: " + count
            );

            if (count >= 5) {
                response.getWriter().println(
                        "Minimum 5 trusted contacts requirement is satisfied."
                );
            } else {
                response.getWriter().println(
                        "You need to add " +
                        (5 - count) +
                        " more trusted contact(s)."
                );
            }
        }
    }
}