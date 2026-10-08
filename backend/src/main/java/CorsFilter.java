import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.*;

@WebFilter("/*")
public class CorsFilter implements Filter {
    private Set<String> allowedOrigins;

    @Override public void init(FilterConfig config) {
        allowedOrigins = new HashSet<>(Arrays.asList(
                "http://localhost:5500", "http://127.0.0.1:5500",
                "http://localhost:5501", "http://127.0.0.1:5501",
                "http://localhost:5173", "http://127.0.0.1:5173",
                "http://localhost:3000", "http://127.0.0.1:3000"));
        String configured = System.getenv("CORS_ALLOWED_ORIGINS");
        if (configured != null) for (String origin : configured.split(",")) {
            if (!origin.isBlank()) allowedOrigins.add(origin.trim());
        }
    }

    @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String origin = req.getHeader("Origin");
        boolean allowed = origin == null || allowedOrigins.contains(origin);
        if (origin != null && allowed) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Vary", "Origin");
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");
        res.setHeader("Access-Control-Max-Age", "3600");
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setStatus(allowed ? HttpServletResponse.SC_NO_CONTENT : HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        chain.doFilter(request, response);
    }

    @Override public void destroy() { }
}
