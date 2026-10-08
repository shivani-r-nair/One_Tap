import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class Security {
    private static final SecureRandom RANDOM = new SecureRandom();
    private Security() {}
    public static String hash(String password) throws Exception {
        byte[] salt = new byte[16]; RANDOM.nextBytes(salt);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 310000, 256);
        byte[] key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        return "pbkdf2$310000$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(key);
    }
    public static boolean verify(String password, String stored) {
        try {
            String[] p=stored.split("\\$"); if(p.length!=4||!p[0].equals("pbkdf2"))return false;
            byte[] salt=Base64.getDecoder().decode(p[2]), expected=Base64.getDecoder().decode(p[3]);
            PBEKeySpec spec=new PBEKeySpec(password.toCharArray(),salt,Integer.parseInt(p[1]),expected.length*8);
            byte[] actual=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return java.security.MessageDigest.isEqual(expected,actual);
        } catch(Exception e){return false;}
    }
    public static Integer userId(HttpServletRequest r){Object id=r.getSession(false)==null?null:r.getSession(false).getAttribute("userId");return id instanceof Integer?(Integer)id:null;}
    public static boolean requireUser(HttpServletRequest r,HttpServletResponse p)throws IOException {
        if(userId(r)!=null)return true;json(p,401,"{\"status\":\"error\",\"message\":\"Please log in again.\"}");return false;
    }
    public static void json(HttpServletResponse r,int code,String body)throws IOException{r.setStatus(code);r.setCharacterEncoding("UTF-8");r.setContentType("application/json");r.getWriter().write(body);}
    public static String quote(String s){if(s==null)return "null";return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r")+"\"";}
}
