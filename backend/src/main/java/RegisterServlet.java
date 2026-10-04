import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/register")
public class RegisterServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        String fullName = request.getParameter("fullName");
        String email = request.getParameter("email");
        String phoneNumber = request.getParameter("phoneNumber");
        int countryId = Integer.parseInt(request.getParameter("countryId"));
        int stateId = Integer.parseInt(request.getParameter("stateId"));
        String address = request.getParameter("address");
        double latitude = Double.parseDouble(request.getParameter("latitude"));
        double longitude = Double.parseDouble(request.getParameter("longitude"));

        User user = new User(
                0,
                fullName,
                email,
                phoneNumber,
                countryId,
                stateId,
                address,
                latitude,
                longitude
        );

        UserDAO userDAO = new UserDAO();

        boolean success = userDAO.addUser(user);

        response.setContentType("text/plain");

        if (success) {
            response.getWriter().println("User registered successfully!");
        } else {
            response.getWriter().println("User registration failed.");
        }
    }
}