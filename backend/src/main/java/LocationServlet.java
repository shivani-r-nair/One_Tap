import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@WebServlet("/location-data")
public class LocationServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        StringBuilder json = new StringBuilder("{");

        try (Connection connection = DatabaseConnection.getConnection()) {
            if (connection == null) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.getWriter().println("{\"status\":\"error\",\"message\":\"Database connection unavailable\"}");
                return;
            }

            // Fetch countries
            json.append("\"countries\":[");
            String countrySql = "SELECT country_id, country_name, country_code FROM countries ORDER BY country_id";
            try (PreparedStatement stmt = connection.prepareStatement(countrySql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"countryId\":").append(rs.getInt("country_id")).append(",")
                        .append("\"countryName\":\"").append(escape(rs.getString("country_name"))).append("\",")
                        .append("\"countryCode\":\"").append(escape(rs.getString("country_code"))).append("\"")
                        .append("}");
                    first = false;
                }
            }
            json.append("],");

            // Fetch states
            json.append("\"states\":[");
            String stateSql = "SELECT state_id, country_id, state_name FROM states ORDER BY country_id, state_id";
            try (PreparedStatement stmt = connection.prepareStatement(stateSql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"stateId\":").append(rs.getInt("state_id")).append(",")
                        .append("\"countryId\":").append(rs.getInt("country_id")).append(",")
                        .append("\"stateName\":\"").append(escape(rs.getString("state_name"))).append("\"")
                        .append("}");
                    first = false;
                }
            }
            json.append("],");

            // District values come only from the maintained database table.
            json.append("\"districts\":[");
            String districtSql = "SELECT district_id, state_id, district_name FROM districts ORDER BY state_id, district_name";
            try (PreparedStatement stmt = connection.prepareStatement(districtSql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"districtId\":").append(rs.getInt("district_id")).append(",")
                        .append("\"stateId\":").append(rs.getInt("state_id")).append(",")
                        .append("\"districtName\":\"").append(escape(rs.getString("district_name"))).append("\"")
                        .append("}");
                    first = false;
                }
            }
            json.append("],");

            // Fetch emergency contacts
            json.append("\"emergencyContacts\":[");
            String emergSql = "SELECT contact_id, country_id, service_name, emergency_number FROM emergency_contacts ORDER BY contact_id";
            try (PreparedStatement stmt = connection.prepareStatement(emergSql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"contactId\":").append(rs.getInt("contact_id")).append(",")
                        .append("\"countryId\":").append(rs.getInt("country_id")).append(",")
                        .append("\"serviceName\":\"").append(escape(rs.getString("service_name"))).append("\",")
                        .append("\"emergencyNumber\":\"").append(escape(rs.getString("emergency_number"))).append("\"")
                        .append("}");
                    first = false;
                }
            }
            json.append("],");
            json.append("\"status\":\"success\"");
            json.append("}");

            response.getWriter().println(json.toString());

        } catch (Exception e) {
            System.err.println("Location data request failed: " + e.getClass().getSimpleName());
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("{\"status\":\"error\",\"message\":\"Location lists are unavailable. Check the database migration and connection.\"}");
        }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
