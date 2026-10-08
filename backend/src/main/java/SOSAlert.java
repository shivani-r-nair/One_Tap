public class SOSAlert {

    private int alertId;
    private int userId;
    private Double latitude;
    private Double longitude;
    private String status;

    public SOSAlert(int userId,
                    Double latitude,
                    Double longitude,
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

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getStatus() {
        return status;
    }
}
