import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class UserDAO {

    public boolean addUser(User user) {
        return registerUser(user) > 0;
    }

    public int registerUser(User user) {
        String sql = "INSERT INTO users " +
                "(full_name, email, phone_number, country_id, state_id, address, latitude, longitude) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {

            if (connection == null) return -1;

            statement.setString(1, user.getFullName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPhoneNo());
            statement.setInt(4, user.getCountryId());
            statement.setInt(5, user.getStateId());
            statement.setString(6, user.getAddress());
            statement.setDouble(7, user.getLatitude());
            statement.setDouble(8, user.getLongitude());

            statement.executeUpdate();

            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getInt(1);
                }
            }

            return 1;

        } catch (Exception e) {
            System.out.println("Error adding user!");
            e.printStackTrace();
            return -1;
        }
    }

    public boolean updateUser(User user) {
        String sql = "UPDATE users SET " +
                "full_name = ?, email = ?, phone_number = ?, " +
                "country_id = ?, state_id = ?, address = ?, " +
                "latitude = ?, longitude = ? " +
                "WHERE user_id = ?";

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            if (connection == null) return false;

            statement.setString(1, user.getFullName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPhoneNo());
            statement.setInt(4, user.getCountryId());
            statement.setInt(5, user.getStateId());
            statement.setString(6, user.getAddress());
            statement.setDouble(7, user.getLatitude());
            statement.setDouble(8, user.getLongitude());
            statement.setInt(9, user.getUserId());

            int rows = statement.executeUpdate();
            return rows > 0;

        } catch (Exception e) {
            System.out.println("Error updating user profile!");
            e.printStackTrace();
            return false;
        }
    }

    public User getUserById(int userId) {
        String sql = "SELECT user_id, full_name, email, phone_number, " +
                     "country_id, state_id, address, latitude, longitude " +
                     "FROM users WHERE user_id = ?";

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            if (connection == null) return null;

            statement.setInt(1, userId);

            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    return new User(
                        result.getInt("user_id"),
                        result.getString("full_name"),
                        result.getString("email"),
                        result.getString("phone_number"),
                        result.getInt("country_id"),
                        result.getInt("state_id"),
                        result.getString("address"),
                        result.getDouble("latitude"),
                        result.getDouble("longitude")
                    );
                }
            }

        } catch (Exception e) {
            System.out.println("Error fetching user profile!");
            e.printStackTrace();
        }

        return null;
    }
}