import jakarta.servlet.*;import jakarta.servlet.annotation.WebServlet;import jakarta.servlet.http.*;import java.io.IOException;
@WebServlet("/session") public class SessionServlet extends HttpServlet{
 protected void doGet(HttpServletRequest q,HttpServletResponse p)throws IOException{if(!Security.requireUser(q,p))return;try{User u=new UserDAO().getUserById(Security.userId(q));if(u==null){Security.json(p,401,"{\"message\":\"Please log in again.\"}");return;}Security.json(p,200,"{\"user\":{\"userId\":"+u.getUserId()+",\"fullName\":"+Security.quote(u.getFullName())+",\"email\":"+Security.quote(u.getEmail())+",\"phoneNumber\":"+Security.quote(u.getPhoneNo())+"}}");}catch(Exception e){Security.json(p,503,"{\"message\":\"Session lookup failed.\"}");}}
 protected void doPost(HttpServletRequest q,HttpServletResponse p)throws IOException{HttpSession s=q.getSession(false);if(s!=null)s.invalidate();Security.json(p,200,"{\"status\":\"success\"}");}
}
