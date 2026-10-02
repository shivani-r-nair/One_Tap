public class Main {

    public static void main(String[] args) {

        User user = new User(
            0,
            "Test User",
            "test2@example.com",
            "9876543210",
            1
        );

        UserDAO userDAO = new UserDAO();

        if (userDAO.addUser(user)) {
            System.out.println("User added successfully!");
        } else {
            System.out.println("Failed to add user.");
        }
    }
}