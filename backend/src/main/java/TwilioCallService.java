import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.twilio.type.Twiml;
import java.net.URI;

public class TwilioCallService {
    public record SmsSubmission(String providerStatus, String deliveryStatus, String messageSid) { }
    public record CallSubmission(String providerStatus, String callSid) { }

    private static final String ACCOUNT_SID =
            System.getenv("TWILIO_ACCOUNT_SID");

    private static final String AUTH_TOKEN =
            System.getenv("TWILIO_AUTH_TOKEN");

    private static final String TWILIO_PHONE_NUMBER =
            System.getenv("TWILIO_PHONE_NUMBER");

    public static String makeCall(String phoneNumber) {

        if (ACCOUNT_SID == null ||
            AUTH_TOKEN == null ||
            TWILIO_PHONE_NUMBER == null) {

            throw new IllegalStateException("Twilio is not configured.");
        }

        Twilio.init(ACCOUNT_SID, AUTH_TOKEN);

        Call call = Call.creator(
                new PhoneNumber(phoneNumber),
                new PhoneNumber(TWILIO_PHONE_NUMBER),
                "https://webhooks.twilio.com/v1/Voice/Template/voice_text_to_speech"
        ).create();

        return call.getStatus() == null ? "queued" : call.getStatus().toString();
    }

    /** Preserves the existing voice alert, while keeping local/test SOS requests provider-free by default. */
    public static CallSubmission makeCallForAlert(String phoneNumber) {
        if (isTestMode())
            return new CallSubmission("TEST_MODE", null);
        if (ACCOUNT_SID == null || AUTH_TOKEN == null || TWILIO_PHONE_NUMBER == null)
            return new CallSubmission("CONFIGURATION_ERROR", null);
        try {
            Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
            Call call = Call.creator(new PhoneNumber(phoneNumber), new PhoneNumber(TWILIO_PHONE_NUMBER),
                    new Twiml("<Response><Say>Emergency alert from One Tap. A person who selected you as a trusted contact may need immediate assistance. Please check your messages and contact them now.</Say></Response>")).create();
            return new CallSubmission(call.getStatus() == null ? "unknown" : call.getStatus().toString().toLowerCase(), call.getSid());
        } catch (Exception e) {
            return new CallSubmission("PROVIDER_ERROR", null);
        }
    }

    /** Test mode is the safe default; live SMS requires an explicit production opt-in. */
    public static SmsSubmission sendSms(String phoneNumber, String body, int notificationId) {
        if (isTestMode())
            return new SmsSubmission("TEST_MODE", "MOCKED", null);
        if (!"true".equalsIgnoreCase(System.getenv("TWILIO_SMS_ENABLED")))
            return new SmsSubmission("DISABLED", "NOT_SENT", null);
        String account = System.getenv("TWILIO_ACCOUNT_SID");
        String token = System.getenv("TWILIO_AUTH_TOKEN");
        String from = System.getenv("TWILIO_PHONE_NUMBER");
        if (account == null || account.isBlank() || token == null || token.isBlank() || from == null || from.isBlank())
            return new SmsSubmission("CONFIGURATION_ERROR", "FAILED", null);
        try {
            Twilio.init(account, token);
            var creator = Message.creator(new PhoneNumber(phoneNumber), new PhoneNumber(from), body);
            String callback = System.getenv("TWILIO_STATUS_CALLBACK_URL");
            if (callback != null && !callback.isBlank()) {
                String separator = callback.contains("?") ? "&" : "?";
                creator.setStatusCallback(URI.create(callback + separator + "notificationId=" + notificationId));
            }
            Message message = creator.create();
            String providerStatus = message.getStatus() == null ? "unknown" : message.getStatus().toString().toLowerCase();
            return new SmsSubmission(providerStatus, "QUEUED", message.getSid());
        } catch (ApiException e) {
            Integer code = e.getStatusCode();
            if (code != null && code >= 400 && code < 500) return new SmsSubmission("REJECTED", "FAILED", null);
            return new SmsSubmission("UNKNOWN", "UNKNOWN", null);
        } catch (Exception e) {
            return new SmsSubmission("UNKNOWN", "UNKNOWN", null);
        }
    }

    private static boolean isTestMode() {
        return !Boolean.getBoolean("onetap.allowLiveDelivery") ||
                !"false".equalsIgnoreCase(System.getenv("TWILIO_TEST_MODE"));
    }
}
