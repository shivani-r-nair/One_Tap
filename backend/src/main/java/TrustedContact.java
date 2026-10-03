public class TrustedContact {

    private int contactId;
    private int userId;
    private String contactName;
    private String phoneNumber;
    private String relationship;

    public TrustedContact(int userId, String contactName,
                          String phoneNumber, String relationship) {

        this.userId = userId;
        this.contactName = contactName;
        this.phoneNumber = phoneNumber;
        this.relationship = relationship;
    }

    public int getContactId() {
        return contactId;
    }

    public int getUserId() {
        return userId;
    }

    public String getContactName() {
        return contactName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getRelationship() {
        return relationship;
    }
}