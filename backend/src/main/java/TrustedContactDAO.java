import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;
import java.util.ArrayList;
import java.sql.SQLException;

public class TrustedContactDAO {

    public boolean addTrustedContact(TrustedContact contact) {

        String sql = "INSERT INTO trusted_contacts " +
                "(user_id, contact_name, phone_number, relationship) " +
                "VALUES (?, ?, ?, ?)";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement =
                    connection.prepareStatement(sql);

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

        String sql =
                "SELECT COUNT(*) FROM trusted_contacts WHERE user_id = ?";

        try {
            Connection connection =
                    DatabaseConnection.getConnection();

            PreparedStatement statement =
                    connection.prepareStatement(sql);

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

    public List<TrustedContact> getTrustedContacts(int userId) {

        List<TrustedContact> contacts = new ArrayList<>();

        String sql =
                "SELECT contact_id, user_id, contact_name, " +
                "phone_number, relationship " +
                "FROM trusted_contacts WHERE user_id = ?";

        try {
            Connection connection =
                    DatabaseConnection.getConnection();

            PreparedStatement statement =
                    connection.prepareStatement(sql);

            statement.setInt(1, userId);

            ResultSet result = statement.executeQuery();

            while (result.next()) {

                TrustedContact contact = new TrustedContact(
                        result.getInt("user_id"),
                        result.getString("contact_name"),
                        result.getString("phone_number"),
                        result.getString("relationship")
                );

                contacts.add(contact);
            }

            result.close();
            statement.close();
            connection.close();

        } catch (Exception e) {
            System.out.println("Error getting trusted contacts!");
            e.printStackTrace();
        }

        return contacts;
    }

    public List<TrustedContact> getTrustedContactsStrict(int userId) throws SQLException {
        List<TrustedContact> contacts = new ArrayList<>();
        String sql = "SELECT contact_id,user_id,contact_name,phone_number,relationship FROM trusted_contacts WHERE user_id=? ORDER BY contact_id";
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c == null) throw new SQLException("Database connection unavailable.");
            try (PreparedStatement s = c.prepareStatement(sql)) {
                s.setInt(1, userId);
                try (ResultSet r = s.executeQuery()) {
                    while (r.next()) contacts.add(new TrustedContact(r.getInt("contact_id"), r.getInt("user_id"),
                            r.getString("contact_name"), r.getString("phone_number"), r.getString("relationship")));
                }
            }
        }
        return contacts;
    }
}
