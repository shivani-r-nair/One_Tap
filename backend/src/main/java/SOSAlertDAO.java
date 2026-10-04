import java.sql.Connection;
import java.sql.PreparedStatement;

public class SOSAlertDAO {

    public boolean createAlert(SOSAlert alert) {

        String sql =
                "INSERT INTO sos_alerts " +
                "(user_id, latitude, longitude, status) " +
                "VALUES (?, ?, ?, ?)";

        try {
            Connection connection =
                    DatabaseConnection.getConnection();

            PreparedStatement statement =
                    connection.prepareStatement(sql);

            statement.setInt(1, alert.getUserId());
            statement.setDouble(2, alert.getLatitude());
            statement.setDouble(3, alert.getLongitude());
            statement.setString(4, alert.getStatus());

            statement.executeUpdate();

            statement.close();
            connection.close();

            return true;

        } catch (Exception e) {

            System.out.println("Error creating SOS alert!");
            e.printStackTrace();

            return false;
        }
    }
}