import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class TrustedContactDAO {

    public boolean addTrustedContact(TrustedContact contact) {

        String sql = "INSERT INTO trusted_contacts " +
                "(user_id, contact_name, phone_number, relationship) " +
                "VALUES (?, ?, ?, ?)";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement = connection.prepareStatement(sql);

            statement.setInt(1, contact.getUserId());
            statement.setString(2, contact.getContactName());
            statement.setString(3, contact.getPhoneNumber());
            statement.setString(4, contact.getRelationship());

            statement.executeUpdate();

            statement.close();
            connection.close();

            return true;

        } catch (Exception e) {
            System.out.println("Error adding trusted contact!");
            e.printStackTrace();
            return false;
        }
    }


    public int getTrustedContactCount(int userId) {

        String sql = "SELECT COUNT(*) FROM trusted_contacts WHERE user_id = ?";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement = connection.prepareStatement(sql);

            statement.setInt(1, userId);

            ResultSet result = statement.executeQuery();

            if (result.next()) {

                int count = result.getInt(1);

                result.close();
                statement.close();
                connection.close();

                return count;
            }

            result.close();
            statement.close();
            connection.close();

        } catch (Exception e) {
            System.out.println("Error counting trusted contacts!");
            e.printStackTrace();
        }

        return 0;
    }
}