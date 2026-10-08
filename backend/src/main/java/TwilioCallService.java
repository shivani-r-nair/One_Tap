import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.type.PhoneNumber;

public class TwilioCallService {

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
}
