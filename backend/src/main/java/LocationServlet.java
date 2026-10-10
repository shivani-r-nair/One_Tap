import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

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
            boolean hasRegionType = hasColumn(connection, "states", "region_type");
            String stateSql = "SELECT state_id, country_id, state_name" +
                    (hasRegionType ? ", region_type" : "") +
                    " FROM states ORDER BY country_id, state_name";
            try (PreparedStatement stmt = connection.prepareStatement(stateSql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    int countryId = rs.getInt("country_id");
                    String stateName = rs.getString("state_name");
                    String regionType = hasRegionType ? rs.getString("region_type") : null;
                    if (regionType == null || regionType.isBlank()) regionType = indiaRegionType(countryId, stateName);
                    json.append("{")
                        .append("\"stateId\":").append(rs.getInt("state_id")).append(",")
                        .append("\"countryId\":").append(countryId).append(",")
                        .append("\"stateName\":\"").append(escape(stateName)).append("\",")
                        .append("\"regionType\":\"").append(escape(regionType)).append("\"")
                        .append("}");
                    first = false;
                }
            }
            json.append("],");

            // Fetch emergency contacts
            json.append("\"emergencyContacts\":[");
            boolean hasSmsSupport = hasColumn(connection, "emergency_contacts", "supports_sms") &&
                    hasColumn(connection, "emergency_contacts", "sms_number");
            String emergSql = "SELECT contact_id, country_id, service_name, emergency_number" +
                    (hasSmsSupport ? ", supports_sms, sms_number" : "") + " FROM emergency_contacts ORDER BY contact_id";
            try (PreparedStatement stmt = connection.prepareStatement(emergSql);
                 ResultSet rs = stmt.executeQuery()) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) json.append(",");
                    json.append("{")
                        .append("\"contactId\":").append(rs.getInt("contact_id")).append(",")
                        .append("\"countryId\":").append(rs.getInt("country_id")).append(",")
                        .append("\"serviceName\":\"").append(escape(rs.getString("service_name"))).append("\",")
                        .append("\"emergencyNumber\":\"").append(escape(rs.getString("emergency_number"))).append("\",")
                        .append("\"supportsSms\":").append(hasSmsSupport && rs.getBoolean("supports_sms")).append(",")
                        .append("\"smsNumber\":").append(hasSmsSupport ? Security.quote(rs.getString("sms_number")) : "null")
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

    private static boolean hasColumn(Connection c, String table, String column) throws SQLException {
        try (ResultSet rs = c.getMetaData().getColumns(c.getCatalog(), null, table, column)) { return rs.next(); }
    }

    private static String indiaRegionType(int countryId, String name) {
        if (countryId != 1) return "Region";
        return switch (name) {
            case "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
                 "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry" -> "Union Territory";
            default -> "State";
        };
    }
}
