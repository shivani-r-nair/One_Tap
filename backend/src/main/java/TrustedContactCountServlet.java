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