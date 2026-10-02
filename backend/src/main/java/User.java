public class User {

    private int userId;
    private String fullName;
    private String email;
    private String phoneNo;
    private int countryId;

    public User(int userId, String fullName, String email, String phoneNo, int countryId) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phoneNo = phoneNo;
        this.countryId = countryId;
    }

    public int getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNo() {
        return phoneNo;
    }

    public int getCountryId() {
        return countryId;
    }
}