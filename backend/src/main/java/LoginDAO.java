import java.sql.*;

public class LoginDAO {
    public User login(String email, String password) {
        String sql="SELECT user_id,full_name,email,phone_number,country_id,state_id,address,latitude,longitude,password_hash FROM users WHERE LOWER(email)=LOWER(?)";
        try(Connection c=DatabaseConnection.getConnection();PreparedStatement s=c.prepareStatement(sql)){
            s.setString(1,email.trim());try(ResultSet r=s.executeQuery()){if(!r.next())return null;String hash=r.getString("password_hash");if(hash==null||!Security.verify(password,hash))return null;
                return new User(r.getInt("user_id"),r.getString("full_name"),r.getString("email"),r.getString("phone_number"),r.getInt("country_id"),r.getInt("state_id"),r.getString("address"),r.getDouble("latitude"),r.getDouble("longitude"));}
        }catch(Exception e){throw new IllegalStateException("Authentication service is unavailable.");}
    }
}
