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

        int userId = Integer.parseInt(
                request.getParameter("userId")
        );

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

        response.setContentType("text/plain");

        if (success) {
            response.getWriter().println(
                    "Trusted contact added successfully!"
            );
        } else {
            response.getWriter().println(
                    "Failed to add trusted contact."
            );
        }
    }
}