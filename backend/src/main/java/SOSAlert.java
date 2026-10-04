public class SOSAlert {

    private int alertId;
    private int userId;
    private double latitude;
    private double longitude;
    private String status;

    public SOSAlert(int userId,
                    double latitude,
                    double longitude,
                    String status) {

        this.userId = userId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = status;
    }

    public int getAlertId() {
        return alertId;
    }

    public int getUserId() {
        return userId;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public String getStatus() {
        return status;
    }
}