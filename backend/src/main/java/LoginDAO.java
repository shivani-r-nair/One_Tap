import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class LoginDAO {

    public User login(String email, String phoneNumber) {

        String sql = "SELECT user_id, full_name, email, phone_number, country_id " +
                     "FROM users WHERE email = ? AND phone_number = ?";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement = connection.prepareStatement(sql);

            statement.setString(1, email);
            statement.setString(2, phoneNumber);

            ResultSet result = statement.executeQuery();

            if (result.next()) {

                User user = new User(
                    result.getInt("user_id"),
                    result.getString("full_name"),
                    result.getString("email"),
                    result.getString("phone_number"),
                    result.getInt("country_id")
                );

                result.close();
                statement.close();
                connection.close();

                return user;
            }

            result.close();
            statement.close();
            connection.close();

        } catch (Exception e) {
            System.out.println("Login error!");
            e.printStackTrace();
        }

        return null;
    }
}