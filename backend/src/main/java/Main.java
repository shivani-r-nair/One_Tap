public class Main {

    public static void main(String[] args) {

        LoginDAO loginDAO = new LoginDAO();

        User user = loginDAO.login(
            "test@example.com",
            "9999999999"
        );

        if (user != null) {
            System.out.println("Login successful!");
            System.out.println("Welcome, " + user.getFullName());
        } else {
            System.out.println("Login failed!");
        }
    }
}