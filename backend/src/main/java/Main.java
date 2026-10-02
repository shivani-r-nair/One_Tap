import java.sql.Connection;
import java.sql.DriverManager;

public class Main {

    public static void main(String[] args) {

        String url = "jdbc:mysql://localhost:3306/one_tap";
        String username = "root";
        String password = "2244@shivani38579";

        try {
            Connection connection = DriverManager.getConnection(
                url,
                username,
                password
            );

            System.out.println("Connected to MySQL successfully!");

            connection.close();

        } catch (Exception e) {
            System.out.println("Connection failed!");
            e.printStackTrace();
        }
    }
}