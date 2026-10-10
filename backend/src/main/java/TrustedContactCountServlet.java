import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/trusted-contact-count")
public class TrustedContactCountServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {
        if (!Security.requireUser(request, response)) return;
        int userId = Security.userId(request);

        TrustedContactDAO contactDAO =
                new TrustedContactDAO();

        int count =
                contactDAO.getTrustedContactCount(userId);

        Security.json(response, 200,
                "{\"status\":\"success\",\"count\":" + count +
                ",\"required\":3,\"satisfied\":" + (count >= 3) +
                ",\"remaining\":" + Math.max(0, 3 - count) + "}");
    }
}
