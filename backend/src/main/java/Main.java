import java.util.List;

public class Main {

    public static void main(String[] args) {

        // Emergency contacts
        EmergencyContactDAO contactDAO = new EmergencyContactDAO();

        List<EmergencyContact> contacts =
                contactDAO.getContactsByCountry(1);

        System.out.println("Emergency Contacts:");

        for (EmergencyContact contact : contacts) {
            System.out.println(
                contact.getServiceName() + " - " +
                contact.getEmergencyNumber()
            );
        }


        // Add a user
        UserDAO userDAO = new UserDAO();

        User user = new User(
                0,
                "Test User",
                "test@example.com",
                "9876543210",
                1,
                13,
                "Test Address",
                10.8505,
                76.2711
        );

        boolean userAdded = userDAO.addUser(user);

        if (userAdded) {
            System.out.println("\nUser added successfully!");
        } else {
            System.out.println("\nFailed to add user.");
        }


        // Trusted contacts
        TrustedContactDAO trustedContactDAO =
                new TrustedContactDAO();

        int userId = 1;

        int contactCount =
                trustedContactDAO.getTrustedContactCount(userId);

        System.out.println("\nTrusted Contact Count: " + contactCount);

        if (contactCount >= 5) {
            System.out.println(
                "Minimum 5 trusted contacts requirement is satisfied."
            );
        } else {
            System.out.println(
                "You need to add " + (5 - contactCount) +
                " more trusted contact(s)."
            );
        }
    }
}