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

        response.setContentType("text/plain");

        if (contacts.isEmpty()) {

            response.getWriter().println(
                    "No trusted contacts found."
            );

        } else {

            response.getWriter().println(
                    "Trusted Contacts:"
            );

            for (TrustedContact contact : contacts) {

                response.getWriter().println(
                        contact.getContactName() +
                        " - " +
                        contact.getPhoneNumber() +
                        " - " +
                        contact.getRelationship()
                );
            }
        }
    }
}