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

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (wantJson) {
            response.setContentType("application/json");
            if (user != null) {
                response.getWriter().println(
                    "{\"status\":\"success\"," +
                    "\"userId\":" + user.getUserId() + "," +
                    "\"fullName\":\"" + escapeJson(user.getFullName()) + "\"," +
                    "\"email\":\"" + escapeJson(user.getEmail()) + "\"," +
                    "\"phoneNumber\":\"" + escapeJson(user.getPhoneNo()) + "\"," +
                    "\"countryId\":" + user.getCountryId() + "," +
                    "\"stateId\":" + user.getStateId() + "," +
                    "\"address\":\"" + escapeJson(user.getAddress() != null ? user.getAddress() : "") + "\"," +
                    "\"latitude\":" + user.getLatitude() + "," +
                    "\"longitude\":" + user.getLongitude() + "}"
                );
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().println("{\"status\":\"error\",\"message\":\"Invalid email or phone number.\"}");
            }
        } else {
            response.setContentType("text/plain");
            if (user != null) {
                response.getWriter().println("Login successful!");
                response.getWriter().println("Welcome, " + user.getFullName());
                response.getWriter().println("User ID: " + user.getUserId());
            } else {
                response.getWriter().println("Invalid email or phone number.");
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}