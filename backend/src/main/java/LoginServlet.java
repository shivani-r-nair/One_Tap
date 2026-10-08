import jakarta.servlet.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {
 protected void doPost(HttpServletRequest q,HttpServletResponse p)throws ServletException,IOException{
  p.setCharacterEncoding("UTF-8");String email=q.getParameter("email"),password=q.getParameter("password");
  if(email==null||!email.matches("(?i)^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$")||password==null||password.isEmpty()){Security.json(p,400,"{\"status\":\"error\",\"message\":\"Enter a valid email and password.\"}");return;}
  try{User u=new LoginDAO().login(email,password);if(u==null){Security.json(p,401,"{\"status\":\"error\",\"message\":\"Incorrect email or password.\"}");return;}
   HttpSession old=q.getSession(false);if(old!=null)old.invalidate();HttpSession session=q.getSession(true);session.setAttribute("userId",u.getUserId());session.setMaxInactiveInterval(60*60*12);
   Security.json(p,200,"{\"status\":\"success\",\"user\":{\"userId\":"+u.getUserId()+",\"fullName\":"+Security.quote(u.getFullName())+",\"email\":"+Security.quote(u.getEmail())+",\"phoneNumber\":"+Security.quote(u.getPhoneNo())+"}}");
  }catch(IllegalStateException e){Security.json(p,503,"{\"status\":\"error\",\"message\":\"Authentication service is unavailable.\"}");}
 }
}
