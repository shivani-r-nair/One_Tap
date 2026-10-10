import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@WebServlet("/districts")
public class DistrictsServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        String rawStateId = request.getParameter("stateId");
        int stateId;
        try {
            stateId = Integer.parseInt(rawStateId);
            if (stateId < 1) throw new NumberFormatException();
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().print("{\"status\":\"error\",\"message\":\"A valid stateId is required.\"}");
            return;
        }

        StringBuilder json = new StringBuilder("{\"status\":\"success\",\"districts\":[");
        try (Connection connection = DatabaseConnection.getConnection()) {
            if (connection == null) throw new IllegalStateException("Database unavailable");
            String sql = "SELECT d.district_id,d.state_id,d.district_name " +
                    "FROM districts d JOIN states s ON s.state_id=d.state_id " +
                    "WHERE d.state_id=? AND s.country_id=1 ORDER BY d.district_name";
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setInt(1, stateId);
                try (ResultSet rows = statement.executeQuery()) {
                    boolean first = true;
                    while (rows.next()) {
                        if (!first) json.append(',');
                        json.append("{\"districtId\":").append(rows.getInt("district_id"))
                                .append(",\"stateId\":").append(rows.getInt("state_id"))
                                .append(",\"districtName\":\"").append(escape(rows.getString("district_name"))).append("\"}");
                        first = false;
                    }
                }
            }
            json.append("]}");
            response.getWriter().print(json);
        } catch (Exception e) {
            System.err.println("District list request failed: " + e.getClass().getSimpleName());
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.getWriter().print("{\"status\":\"error\",\"message\":\"District data is unavailable. Check the database connection and district import.\"}");
        }
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}
