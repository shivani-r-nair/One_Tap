import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;

@WebServlet("/profile-location")
public class ProfileLocationServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest q, HttpServletResponse p) throws ServletException, IOException {
        if (!Security.requireUser(q, p)) return;
        Double lat = number(q.getParameter("latitude"));
        Double lng = number(q.getParameter("longitude"));
        Double accuracy = number(q.getParameter("accuracy"));
        if (lat == null || lng == null || !Double.isFinite(lat) || !Double.isFinite(lng) ||
                lat < -90 || lat > 90 || lng < -180 || lng > 180 ||
                (accuracy != null && (!Double.isFinite(accuracy) || accuracy < 0))) {
            Security.json(p, 400, "{\"status\":\"error\",\"message\":\"Valid detected coordinates are required.\"}"); return;
        }
        try (Connection c = DatabaseConnection.getConnection();
             PreparedStatement s = c.prepareStatement("UPDATE users SET latitude=?,longitude=?,accuracy_m=? WHERE user_id=?")) {
            s.setDouble(1, lat); s.setDouble(2, lng);
            if (accuracy == null) s.setNull(3, Types.DECIMAL); else s.setDouble(3, accuracy);
            s.setInt(4, Security.userId(q));
            if (s.executeUpdate() == 0) { Security.json(p, 404, "{\"message\":\"Profile not found.\"}"); return; }
            Security.json(p, 200, "{\"status\":\"success\",\"message\":\"Device location saved.\"}");
        } catch (Exception e) {
            Security.json(p, 503, "{\"status\":\"error\",\"message\":\"Device location could not be saved.\"}");
        }
    }
    private static Double number(String value) { try { return value == null || value.isBlank() ? null : Double.valueOf(value); } catch (Exception e) { return null; } }
}
