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

        String countryIdParam = request.getParameter("countryId");
        int countryId = (countryIdParam != null && !countryIdParam.isEmpty()) ? Integer.parseInt(countryIdParam) : 1;

        String stateIdParam = request.getParameter("stateId");
        int stateId = (stateIdParam != null && !stateIdParam.isEmpty()) ? Integer.parseInt(stateIdParam) : 12;

        String address = request.getParameter("address");
        if (address == null) address = "Kerala, India";

        String latParam = request.getParameter("latitude");
        double latitude = (latParam != null && !latParam.isEmpty()) ? Double.parseDouble(latParam) : 10.8505;

        String lngParam = request.getParameter("longitude");
        double longitude = (lngParam != null && !lngParam.isEmpty()) ? Double.parseDouble(lngParam) : 76.2711;

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

        int newUserId = userDAO.registerUser(user);
        boolean success = newUserId > 0;

        String format = request.getParameter("format");
        String acceptHeader = request.getHeader("Accept");
        boolean wantJson = "json".equalsIgnoreCase(format) ||
                (acceptHeader != null && acceptHeader.contains("application/json"));

        if (wantJson) {
            response.setContentType("application/json");
            if (success) {
                response.getWriter().println(
                    "{\"status\":\"success\"," +
                    "\"message\":\"User registered successfully!\"," +
                    "\"userId\":" + newUserId + "," +
                    "\"fullName\":\"" + escapeJson(fullName) + "\"," +
                    "\"email\":\"" + escapeJson(email) + "\"," +
                    "\"phoneNumber\":\"" + escapeJson(phoneNumber) + "\"," +
                    "\"countryId\":" + countryId + "," +
                    "\"stateId\":" + stateId + "," +
                    "\"address\":\"" + escapeJson(address) + "\"," +
                    "\"latitude\":" + latitude + "," +
                    "\"longitude\":" + longitude + "}"
                );
            } else {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().println("{\"status\":\"error\",\"message\":\"User registration failed.\"}");
            }
        } else {
            response.setContentType("text/plain");
            if (success) {
                response.getWriter().println("User registered successfully!");
                response.getWriter().println("User ID: " + newUserId);
            } else {
                response.getWriter().println("User registration failed.");
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}