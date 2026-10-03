import java.sql.Connection;
import java.sql.PreparedStatement;

public class UserDAO {

    public boolean addUser(User user) {

        String sql = "INSERT INTO users " +
                "(full_name, email, phone_number, country_id, state_id, address, latitude, longitude) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement = connection.prepareStatement(sql);

            statement.setString(1, user.getFullName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPhoneNo());
            statement.setInt(4, user.getCountryId());
            statement.setInt(5, user.getStateId());
            statement.setString(6, user.getAddress());
            statement.setDouble(7, user.getLatitude());
            statement.setDouble(8, user.getLongitude());

            statement.executeUpdate();

            statement.close();
            connection.close();

            return true;

        } catch (Exception e) {
            System.out.println("Error adding user!");
            e.printStackTrace();
            return false;
        }
    }
}