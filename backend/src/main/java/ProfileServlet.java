import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.*;

@WebServlet("/profile")
public class ProfileServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest q, HttpServletResponse p) throws ServletException, IOException {
        if (!Security.requireUser(q, p)) return;
        String sql = "SELECT u.full_name,u.email,u.phone_number,u.country_id,u.state_id,u.district_id," +
                "COALESCE(d.district_name,u.district) AS district,u.address,u.latitude,u.longitude," +
                "u.locality,u.accuracy_m,c.country_name,st.state_name " +
                "FROM users u LEFT JOIN countries c ON c.country_id=u.country_id " +
                "LEFT JOIN states st ON st.state_id=u.state_id " +
                "LEFT JOIN districts d ON d.district_id=u.district_id " +
                "WHERE u.user_id=?";
        try (Connection c = DatabaseConnection.getConnection(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setInt(1, Security.userId(q));
            try (ResultSet r = s.executeQuery()) {
                if (!r.next()) { Security.json(p, 404, "{\"message\":\"Profile not found.\"}"); return; }
                String district = r.getString("district");
                String json = "{\"status\":\"success\",\"fullName\":" + Security.quote(r.getString("full_name")) +
                        ",\"email\":" + Security.quote(r.getString("email")) +
                        ",\"phoneNumber\":" + Security.quote(r.getString("phone_number")) +
                        ",\"countryId\":" + nullableInt(r, "country_id") +
                        ",\"countryName\":" + Security.quote(r.getString("country_name")) +
                        ",\"stateId\":" + nullableInt(r, "state_id") +
                        ",\"stateName\":" + Security.quote(r.getString("state_name")) +
                        ",\"districtId\":" + nullableInt(r, "district_id") +
                        ",\"district\":" + Security.quote(district) +
                        ",\"locality\":" + Security.quote(r.getString("locality")) +
                        ",\"address\":" + Security.quote(r.getString("address")) +
                        ",\"latitude\":" + nullableDouble(r, "latitude") +
                        ",\"longitude\":" + nullableDouble(r, "longitude") +
                        ",\"accuracy\":" + nullableDouble(r, "accuracy_m") +
                        ",\"profileComplete\":" + (r.getObject("country_id") != null && r.getObject("state_id") != null &&
                        r.getObject("district_id") != null && r.getString("locality") != null && r.getString("address") != null) + "}";
                Security.json(p, 200, json);
            }
        } catch (Exception e) {
            Security.json(p, 503, "{\"status\":\"error\",\"message\":\"Could not load profile. Apply the profile geography migration and check the database connection.\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest q, HttpServletResponse p) throws ServletException, IOException {
        if (!Security.requireUser(q, p)) return;
        q.setCharacterEncoding("UTF-8");
        String name = value(q, "fullName"), email = value(q, "email"), phone = value(q, "phoneNumber");
        String locality = value(q, "locality"), address = value(q, "address");
        int countryId = integer(q, "countryId"), stateId = integer(q, "stateId"), districtId = integer(q, "districtId");
        if (name.length() < 2 || name.length() > 100 || !email.matches("(?i)^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$") ||
                !phone.matches("\\+?[0-9 ()-]{8,30}") || locality.isBlank() || address.isBlank() || countryId < 1 || stateId < 1 || districtId < 1) {
            Security.json(p, 400, "{\"status\":\"error\",\"message\":\"Complete each profile field and choose a country, state/region, and district.\"}"); return;
        }
        Double lat = number(q, "latitude"), lng = number(q, "longitude"), accuracy = number(q, "accuracy");
        if ((lat == null) != (lng == null) || (lat != null && (!Double.isFinite(lat) || !Double.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (accuracy != null && (!Double.isFinite(accuracy) || accuracy < 0))))) {
            Security.json(p, 400, "{\"status\":\"error\",\"message\":\"GPS coordinates or accuracy are invalid.\"}"); return;
        }
        try (Connection c = DatabaseConnection.getConnection()) {
            try (PreparedStatement check = c.prepareStatement("SELECT 1 FROM states s JOIN districts d ON d.state_id=s.state_id WHERE s.state_id=? AND s.country_id=? AND d.district_id=?")) {
                check.setInt(1, stateId); check.setInt(2, countryId); check.setInt(3, districtId);
                try (ResultSet r = check.executeQuery()) {
                    if (!r.next()) { Security.json(p, 400, "{\"status\":\"error\",\"message\":\"The selected state and district do not belong to the selected country.\"}"); return; }
                }
            }
            String districtName;
            try (PreparedStatement d = c.prepareStatement("SELECT district_name FROM districts WHERE district_id=? AND state_id=?")) {
                d.setInt(1, districtId); d.setInt(2, stateId);
                try (ResultSet r = d.executeQuery()) { r.next(); districtName = r.getString(1); }
            }
            String sql = "UPDATE users SET full_name=?,email=?,phone_number=?,country_id=?,state_id=?,district_id=?,district=?,locality=?,address=?,latitude=?,longitude=?,accuracy_m=? WHERE user_id=?";
            try (PreparedStatement s = c.prepareStatement(sql)) {
                s.setString(1, name); s.setString(2, email); s.setString(3, phone);
                s.setInt(4, countryId); s.setInt(5, stateId); s.setInt(6, districtId); s.setString(7, districtName);
                s.setString(8, locality); s.setString(9, address);
                if (lat == null) s.setNull(10, Types.DECIMAL); else s.setDouble(10, lat);
                if (lng == null) s.setNull(11, Types.DECIMAL); else s.setDouble(11, lng);
                if (accuracy == null) s.setNull(12, Types.DECIMAL); else s.setDouble(12, accuracy);
                s.setInt(13, Security.userId(q));
                if (s.executeUpdate() == 0) { Security.json(p, 404, "{\"message\":\"Profile not found.\"}"); return; }
            }
            Security.json(p, 200, "{\"status\":\"success\",\"message\":\"Profile saved.\"}");
        } catch (SQLIntegrityConstraintViolationException e) {
            Security.json(p, 409, "{\"status\":\"error\",\"message\":\"Email or phone number already belongs to another account.\"}");
        } catch (Exception e) {
            Security.json(p, 503, "{\"status\":\"error\",\"message\":\"Profile could not be saved. Apply migration_002_profile_geography.sql and check the database connection.\"}");
        }
    }

    private static String value(HttpServletRequest q, String key) { String s = q.getParameter(key); return s == null ? "" : s.trim(); }
    private static int integer(HttpServletRequest q, String key) { try { return Integer.parseInt(value(q, key)); } catch (Exception e) { return -1; } }
    private static Double number(HttpServletRequest q, String key) { try { String s = value(q, key); return s.isEmpty() ? null : Double.valueOf(s); } catch (Exception e) { return null; } }
    private static String nullableInt(ResultSet r, String key) throws SQLException { int v = r.getInt(key); return r.wasNull() ? "null" : String.valueOf(v); }
    private static String nullableDouble(ResultSet r, String key) throws SQLException { double v = r.getDouble(key); return r.wasNull() ? "null" : String.valueOf(v); }
}
