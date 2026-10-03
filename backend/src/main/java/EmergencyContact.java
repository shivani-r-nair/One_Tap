public class EmergencyContact {

    private int contactId;
    private int countryId;
    private String serviceName;
    private String emergencyNumber;

    public EmergencyContact(int contactId, int countryId,
                            String serviceName, String emergencyNumber) {

        this.contactId = contactId;
        this.countryId = countryId;
        this.serviceName = serviceName;
        this.emergencyNumber = emergencyNumber;
    }

    public int getContactId() {
        return contactId;
    }

    public int getCountryId() {
        return countryId;
    }

    public String getServiceName() {
        return serviceName;
    }

    public String getEmergencyNumber() {
        return emergencyNumber;
    }
}