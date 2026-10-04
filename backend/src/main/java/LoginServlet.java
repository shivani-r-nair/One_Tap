import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        String email = request.getParameter("email");
        String phoneNumber = request.getParameter("phoneNumber");

        LoginDAO loginDAO = new LoginDAO();

        User user = loginDAO.login(email, phoneNumber);

        response.setContentType("text/plain");

        if (user != null) {
            response.getWriter().println("Login successful!");
            response.getWriter().println("Welcome, " + user.getFullName());
        } else {
            response.getWriter().println("Invalid email or phone number.");
        }
    }
}