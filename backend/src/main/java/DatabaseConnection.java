import java.sql.Connection;
import java.sql.DriverManager;

public class DatabaseConnection {

    private static final String URL = System.getenv().getOrDefault("DB_URL", "jdbc:mysql://localhost:3306/one_tap?useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC");
    private static final String USERNAME = System.getenv("DB_USERNAME");
    private static final String PASSWORD = System.getenv("DB_PASSWORD");

    public static Connection getConnection() {
        try {

            Class.forName("com.mysql.cj.jdbc.Driver");

            if (USERNAME == null || PASSWORD == null) throw new IllegalStateException("Database credentials are not configured.");
            return DriverManager.getConnection(URL, USERNAME, PASSWORD);

        } catch (Exception e) {
            System.err.println("Database connection failed: " + e.getClass().getSimpleName());
            return null;
        }
    }
}
