import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class EmergencyContactDAO {

    public List<EmergencyContact> getContactsByCountry(int countryId) {

        List<EmergencyContact> contacts = new ArrayList<>();

        String sql = "SELECT contact_id, country_id, service_name, emergency_number " +
                     "FROM emergency_contacts WHERE country_id = ?";

        try {
            Connection connection = DatabaseConnection.getConnection();

            PreparedStatement statement = connection.prepareStatement(sql);
            statement.setInt(1, countryId);

            ResultSet result = statement.executeQuery();

            while (result.next()) {

                EmergencyContact contact = new EmergencyContact(
                    result.getInt("contact_id"),
                    result.getInt("country_id"),
                    result.getString("service_name"),
                    result.getString("emergency_number")
                );

                contacts.add(contact);
            }

            result.close();
            statement.close();
            connection.close();

        } catch (Exception e) {
            System.out.println("Error getting emergency contacts!");
            e.printStackTrace();
        }

        return contacts;
    }
}