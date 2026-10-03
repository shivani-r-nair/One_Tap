public class User {

    private int userId;
    private String fullName;
    private String email;
    private String phoneNo;
    private int countryId;
    private int stateId;
    private String address;
    private double latitude;
    private double longitude;

    public User(int userId, String fullName, String email, String phoneNo,
                int countryId, int stateId, String address,
                double latitude, double longitude) {

        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phoneNo = phoneNo;
        this.countryId = countryId;
        this.stateId = stateId;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
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

    public int getStateId() {
        return stateId;
    }

    public String getAddress() {
        return address;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }
}