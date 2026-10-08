import jakarta.servlet.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;

@WebServlet("/register")
public class RegisterServlet extends HttpServlet {
 protected void doPost(HttpServletRequest q,HttpServletResponse p)throws ServletException,IOException{
  q.setCharacterEncoding("UTF-8");String name=trim(q.getParameter("fullName")),email=trim(q.getParameter("email")),phone=trim(q.getParameter("phoneNumber")),password=q.getParameter("password");
  if(name==null||name.length()<2||name.length()>100||email==null||!email.matches("(?i)^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$")||phone==null||!phone.matches("\\+?[0-9 ()-]{8,20}")||password==null||password.length()<10||!password.matches("(?s).*[A-Za-z].*")||!password.matches("(?s).*[0-9].*")){Security.json(p,400,"{\"status\":\"error\",\"message\":\"Check the name, email, phone number, and password requirements.\"}");return;}
  try(Connection c=DatabaseConnection.getConnection()){
   try(PreparedStatement s=c.prepareStatement("SELECT user_id FROM users WHERE LOWER(email)=LOWER(?) OR phone_number=?")){s.setString(1,email);s.setString(2,phone);try(ResultSet r=s.executeQuery()){if(r.next()){Security.json(p,409,"{\"status\":\"error\",\"message\":\"Already existing user.\"}");return;}}}
   try(PreparedStatement s=c.prepareStatement("INSERT INTO users(full_name,email,phone_number,password_hash) VALUES(?,?,?,?)",Statement.RETURN_GENERATED_KEYS)){s.setString(1,name);s.setString(2,email);s.setString(3,phone);s.setString(4,Security.hash(password));s.executeUpdate();try(ResultSet keys=s.getGeneratedKeys()){if(!keys.next())throw new SQLException();int id=keys.getInt(1);q.getSession(true).setAttribute("userId",id);Security.json(p,201,"{\"status\":\"success\",\"user\":{\"userId\":"+id+",\"fullName\":"+Security.quote(name)+",\"email\":"+Security.quote(email)+",\"phoneNumber\":"+Security.quote(phone)+"}}");}}
  }catch(SQLIntegrityConstraintViolationException e){Security.json(p,409,"{\"status\":\"error\",\"message\":\"Already existing user.\"}");}catch(Exception e){Security.json(p,503,"{\"status\":\"error\",\"message\":\"Account could not be created. Check the database migration and try again.\"}");}
 }
 private String trim(String s){return s==null?null:s.trim();}
}
