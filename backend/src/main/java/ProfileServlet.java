import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/profile")
public class ProfileServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String userIdParam = request.getParameter("userId");
        response.setContentType("application/json");

        if (userIdParam == null || userIdParam.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("{\"status\":\"error\",\"message\":\"userId is required\"}");
            return;
        }

        int userId = Integer.parseInt(userIdParam);
        UserDAO userDAO = new UserDAO();
        User user = userDAO.getUserById(userId);

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
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.getWriter().println("{\"status\":\"error\",\"message\":\"User not found\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");

        String userIdParam = request.getParameter("userId");
        if (userIdParam == null || userIdParam.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("{\"status\":\"error\",\"message\":\"userId is required\"}");
            return;
        }

        int userId = Integer.parseInt(userIdParam);
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
                userId,
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
        boolean success = userDAO.updateUser(user);

        if (success) {
            response.getWriter().println(
                "{\"status\":\"success\"," +
                "\"message\":\"Profile updated successfully!\"," +
                "\"userId\":" + userId + "," +
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
            response.getWriter().println("{\"status\":\"error\",\"message\":\"Failed to update profile\"}");
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
