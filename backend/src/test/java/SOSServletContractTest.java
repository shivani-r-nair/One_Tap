import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.sql.SQLException;
import java.util.*;

/** In-process servlet/API contract checks. All database and Twilio calls are fakes. */
public final class SOSServletContractTest {
    public static void main(String[] args) throws Exception {
        check("+919876543210".equals(PhoneNumberNormalizer.normalize(" +91 (98765) 43210 ")), "E.164 normalization");
        check(PhoneNumberNormalizer.normalize("9876543210") == null, "local numbers without country code must fail");
        check("MOCKED".equals(TwilioCallService.sendSms("+919876543210", "test", 1).deliveryStatus()), "SMS must be mocked by default");

        FakeServlet success = new FakeServlet();
        success.contacts = List.of(new TrustedContact(4, 7, "Maya", "+91 98765 43210", "Friend"));
        HttpResult sent = call(success, trustedParams("00000000-0000-4000-8000-000000000001", "10.8", "76.2"), true);
        check(sent.status == 200 && sent.body.contains("\"status\":\"success\""), "successful SOS is recorded");
        check(sent.body.contains("\"notifications\":[{") && sent.body.contains("\"recipientCount\":1"), "one result row is returned per trusted recipient");
        check(sent.body.contains("\"notificationId\":1") && sent.body.contains("\"phone\":\"********3210\"") && !sent.body.contains("+919876543210"), "recipient is identified without exposing the full phone number");
        check(sent.body.contains("\"status\":\"not_attempted\"") && sent.body.contains("Test mode is active; no SMS was sent") && sent.body.contains("\"deliveryConfirmed\":false"), "mocked provider outcome is not presented as delivered");
        check(success.smsCount == 1 && success.voiceCount == 1, "trusted recipient receives mocked SMS and voice requests");
        check(success.lastSms.contains("Test User") && success.lastSms.contains("Apt 5") && success.lastSms.contains("maps.google.com/?q=10.8,76.2"), "message includes user's name, saved address, and current map link: " + success.lastSms);

        HttpResult duplicate = call(success, trustedParams("00000000-0000-4000-8000-000000000001", "10.8", "76.2"), true);
        check(duplicate.body.contains("\"duplicate\":true") && success.smsCount == 1 && success.voiceCount == 1, "same idempotency key does not send duplicate notifications");

        FakeServlet providerFailure = new FakeServlet();
        providerFailure.contacts = List.of(new TrustedContact(5, 7, "Ari", "+14155550123", "Friend"));
        providerFailure.smsResult = new TwilioCallService.SmsSubmission("REJECTED", "FAILED", null);
        HttpResult failed = call(providerFailure, trustedParams("00000000-0000-4000-8000-000000000002", "", ""), true);
        check(failed.body.contains("\"deliveryStatus\":\"FAILED\"") && failed.body.contains("\"status\":\"failed\"") && failed.body.contains("SMS provider rejected the request."), "provider failure is reported per recipient");

        FakeServlet partial = new FakeServlet();
        partial.contacts = List.of(new TrustedContact(9,7,"Accepted","+14155550124","Friend"),new TrustedContact(10,7,"Rejected","+14155550125","Friend"));
        partial.resultsByPhone.put("+14155550124",new TwilioCallService.SmsSubmission("queued","QUEUED","SM1"));
        partial.resultsByPhone.put("+14155550125",new TwilioCallService.SmsSubmission("REJECTED","FAILED",null));
        String partialId="00000000-0000-4000-8000-000000000008";
        HttpResult partialResult=call(partial,trustedParams(partialId,"",""),true);
        check(partialResult.body.contains("\"retryAvailable\":true")&&partialResult.body.contains("\"status\":\"accepted\"")&&partialResult.body.contains("\"deliveryConfirmed\":false"),"accepted and failed recipients have distinct results; acceptance is not delivery confirmation");
        FakeRetryServlet retry=new FakeRetryServlet(partial.dao);
        HttpResult retried=call(retry,Map.of("requestId",partialId),true);
        check(retried.status==200&&retried.body.contains("\"deliveryStatus\":\"QUEUED\"")&&partial.smsCount==2&&retry.smsCount==1,"retry sends only the failed recipient; already accepted SMS is not duplicated");

        FakeServlet noContacts = new FakeServlet();
        HttpResult empty = call(noContacts, trustedParams("00000000-0000-4000-8000-000000000003", "", ""), true);
        check(empty.status == 200 && empty.body.contains("No trusted contacts are saved") && empty.body.contains("\"recipientCount\":0") && empty.body.contains("\"notifications\":[]") && noContacts.smsCount == 0, "confirmed empty trusted-contact lookup is represented explicitly");
        check(empty.body.contains("\"locationSource\":\"UNAVAILABLE\""), "missing GPS is explicit in the response");

        FakeServlet missingGps = new FakeServlet();
        missingGps.contacts = List.of(new TrustedContact(8, 7, "Nila", "+919876543211", "Friend"));
        call(missingGps, trustedParams("00000000-0000-4000-8000-000000000007", "", ""), true);
        check(missingGps.lastSms.contains("GPS location is unavailable") && !missingGps.lastSms.contains("maps.google.com"), "message contains no invented location when GPS is missing");

        FakeServlet invalidPhone = new FakeServlet();
        invalidPhone.contacts = List.of(new TrustedContact(6, 7, "Local only", "9876543210", "Friend"));
        HttpResult invalid = call(invalidPhone, trustedParams("00000000-0000-4000-8000-000000000004", "", ""), true);
        check(invalid.body.contains("INVALID_PHONE") && invalidPhone.smsCount == 0 && invalidPhone.voiceCount == 0, "invalid recipient number is logged and not sent");

        FakeServlet additional = new FakeServlet();
        Map<String,String> extra = new HashMap<>(); extra.put("requestId", "00000000-0000-4000-8000-000000000005");
        extra.put("recipientMode", "ADDITIONAL"); extra.put("additionalRecipients", "[{\"name\":\"Temporary\",\"phone\":\"+447700900123\"}]");
        extra.put("message", "At the north entrance");
        HttpResult extraResult = call(additional, extra, true);
        check(extraResult.status == 200 && extraResult.body.contains("ADDITIONAL") && additional.smsCount == 1 && additional.voiceCount == 0, "additional recipient is sent without being made trusted or called");
        check(additional.lastSms.contains("At the north entrance"), "optional additional message is included");

        HttpResult unauthorized = call(new FakeServlet(), trustedParams("00000000-0000-4000-8000-000000000006", "", ""), false);
        check(unauthorized.status == 401 && unauthorized.body.contains("Please log in again"), "unauthorized API request is rejected");
        System.out.println("SOS servlet contract checks passed (database and SMS/voice providers mocked; no real notifications sent).");
    }

    private static Map<String,String> trustedParams(String id, String lat, String lng) {
        Map<String,String> p = new HashMap<>(); p.put("requestId", id); p.put("recipientMode", "TRUSTED");
        p.put("latitude", lat); p.put("longitude", lng); return p;
    }
    private static HttpResult call(SOSServlet servlet, Map<String,String> params, boolean authenticated) throws Exception {
        StringWriter body = new StringWriter(); PrintWriter writer = new PrintWriter(body);
        HttpSession session = (HttpSession)Proxy.newProxyInstance(HttpSession.class.getClassLoader(), new Class[]{HttpSession.class}, (p,m,a) -> {
            if (m.getName().equals("getAttribute") && "userId".equals(a[0])) return authenticated ? 7 : null;
            return defaultValue(m.getReturnType());
        });
        HttpServletRequest req = (HttpServletRequest)Proxy.newProxyInstance(HttpServletRequest.class.getClassLoader(), new Class[]{HttpServletRequest.class}, (p,m,a) -> {
            if (m.getName().equals("getSession")) return authenticated ? session : null;
            if (m.getName().equals("getParameter")) return params.get(a[0]);
            if (m.getName().equals("getParameterMap")) return Map.of();
            return defaultValue(m.getReturnType());
        });
        int[] status = {200};
        HttpServletResponse res = (HttpServletResponse)Proxy.newProxyInstance(HttpServletResponse.class.getClassLoader(), new Class[]{HttpServletResponse.class}, (p,m,a) -> {
            if (m.getName().equals("setStatus")) { status[0]=(Integer)a[0]; return null; }
            if (m.getName().equals("getWriter")) return writer;
            return defaultValue(m.getReturnType());
        });
        servlet.doPost(req,res); writer.flush(); return new HttpResult(status[0],body.toString());
    }
    private static Object defaultValue(Class<?> c) {
        if (!c.isPrimitive()) return null; if (c==boolean.class) return false; if (c==char.class) return '\0';
        if (c==long.class) return 0L; if (c==double.class) return 0d; if (c==float.class) return 0f;
        if (c==short.class) return (short)0; if (c==byte.class) return (byte)0; return 0;
    }
    private static void check(boolean ok, String label) { if (!ok) throw new AssertionError(label); }
    private record HttpResult(int status, String body) { }

    private static final class FakeServlet extends SOSServlet {
        List<TrustedContact> contacts = List.of();
        TwilioCallService.SmsSubmission smsResult = new TwilioCallService.SmsSubmission("TEST_MODE","MOCKED",null);
        final Map<String,TwilioCallService.SmsSubmission> resultsByPhone=new HashMap<>();
        final FakeDao dao = new FakeDao(); int smsCount,voiceCount; String lastSms="";
        @Override protected ProfileLocation readProfile(int userId) { return new ProfileLocation("Test User","Apt 5","Kochi",null,null,null); }
        @Override protected List<TrustedContact> loadTrustedContacts(int userId) { return contacts; }
        @Override protected SOSAlertDAO alertDao() { return dao; }
        @Override protected TwilioCallService.SmsSubmission submitSms(String phone,String message,int notificationId) { smsCount++;lastSms=message;return resultsByPhone.getOrDefault(phone,smsResult); }
        @Override protected TwilioCallService.CallSubmission submitVoice(String phone) { voiceCount++;return new TwilioCallService.CallSubmission("TEST_MODE",null); }
    }
    private static final class FakeRetryServlet extends SOSRetryServlet {
        final FakeDao dao; int smsCount;
        FakeRetryServlet(FakeDao dao){this.dao=dao;}
        @Override protected SOSAlertDAO alertDao(){return dao;}
        @Override protected TwilioCallService.SmsSubmission submitSms(String phone,String message,int notificationId){smsCount++;return new TwilioCallService.SmsSubmission("TEST_MODE","MOCKED",null);}
    }
    private static final class FakeDao extends SOSAlertDAO {
        final Map<String,Alert> byKey=new HashMap<>(); final Map<Integer,List<Notification>> rows=new HashMap<>(); int next=1;
        @Override public Alert createAlert(SOSAlert alert,String key,List<Recipient> recipients,String message) {
            if(byKey.containsKey(key)){Alert old=byKey.get(key);return new Alert(old.id(),true,rows.get(old.id()));}
            int id=next++;List<Notification> list=new ArrayList<>();int notification=1;
            for(Recipient r:recipients)list.add(new Notification(notification++,r.type(),r.name(),r.normalizedPhone()==null?r.phone():r.normalizedPhone(),message,r.normalizedPhone()==null?"FAILED":"PENDING",r.normalizedPhone()==null?"INVALID_PHONE":"PENDING","NOT_SENT",0));
            rows.put(id,list);Alert result=new Alert(id,false,list);byKey.put(key,result);return result;
        }
        @Override public List<Notification> getNotifications(int alertId){return rows.getOrDefault(alertId,List.of());}
        @Override public RetryClaim claimRetryableNotifications(int userId,String key){Alert alert=byKey.get(key);if(alert==null)return null;List<Integer> claimed=new ArrayList<>();List<Notification> list=new ArrayList<>();for(Notification n:rows.get(alert.id())){if(SOSServlet.retryAvailable(n)){claimed.add(n.id());list.add(new Notification(n.id(),n.type(),n.name(),n.phone(),n.messageBody(),"PENDING","RETRYING",n.voiceStatus(),n.retryCount()+1));}else list.add(n);}rows.put(alert.id(),list);return new RetryClaim(alert.id(),claimed,list);}
        @Override public void setProviderResult(int notificationId,String providerStatus,String deliveryStatus,String sid){replace(notificationId,n->new Notification(n.id(),n.type(),n.name(),n.phone(),n.messageBody(),deliveryStatus,providerStatus,n.voiceStatus(),n.retryCount()));}
        @Override public void setVoiceResult(int notificationId,String providerStatus,String sid){replace(notificationId,n->new Notification(n.id(),n.type(),n.name(),n.phone(),n.messageBody(),n.deliveryStatus(),n.providerStatus(),providerStatus,n.retryCount()));}
        @Override public void finishAlert(int alertId) { }
        private void replace(int id,java.util.function.Function<Notification,Notification> f){rows.replaceAll((key,list)->list.stream().map(n->n.id()==id?f.apply(n):n).toList());}
    }
}
