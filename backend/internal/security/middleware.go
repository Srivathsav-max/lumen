package security

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/gin-gonic/gin"
)

type SecurityMiddleware struct {
	config      *SecurityConfig
	jwtService  *JWTService
	csrfService *CSRFService
	xssService  *XSSService
	logger      *slog.Logger
}

func NewSecurityMiddleware(config *SecurityConfig, logger *slog.Logger) *SecurityMiddleware {
	jwtService := NewJWTService(&config.JWT, logger)
	csrfService := NewCSRFService(&config.CSRF, logger)
	xssService := NewXSSService(DefaultXSSConfig(), logger)

	return &SecurityMiddleware{
		config:      config,
		jwtService:  jwtService,
		csrfService: csrfService,
		xssService:  xssService,
		logger:      logger,
	}
}

func (sm *SecurityMiddleware) GetCSRFService() *CSRFService {
	return sm.csrfService
}

func (sm *SecurityMiddleware) SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !sm.config.Headers.Enabled {
			c.Next()
			return
		}

		if sm.config.CSP.Enabled {
			cspValue := sm.buildCSPHeader()
			if sm.config.CSP.ReportOnly {
				c.Header("Content-Security-Policy-Report-Only", cspValue)
			} else {
				c.Header("Content-Security-Policy", cspValue)
			}
		}

		if sm.config.Headers.HSTS.Enabled {
			hstsValue := fmt.Sprintf("max-age=%d", sm.config.Headers.HSTS.MaxAge)
			if sm.config.Headers.HSTS.IncludeSubdomains {
				hstsValue += "; includeSubDomains"
			}
			if sm.config.Headers.HSTS.Preload {
				hstsValue += "; preload"
			}
			c.Header("Strict-Transport-Security", hstsValue)
		}

		if sm.config.Headers.ContentTypeOptions != "" {
			c.Header("X-Content-Type-Options", sm.config.Headers.ContentTypeOptions)
		}

		if sm.config.Headers.FrameOptions != "" {
			c.Header("X-Frame-Options", sm.config.Headers.FrameOptions)
		}

		if sm.config.Headers.XSSProtection != "" {
			c.Header("X-XSS-Protection", sm.config.Headers.XSSProtection)
		}

		if sm.config.Headers.ReferrerPolicy != "" {
			c.Header("Referrer-Policy", sm.config.Headers.ReferrerPolicy)
		}

		if sm.config.Headers.PermissionsPolicy != "" {
			c.Header("Permissions-Policy", sm.config.Headers.PermissionsPolicy)
		}

		if sm.config.Headers.RemoveServerHeader {
			c.Header("Server", "")
		}

		c.Header("X-Permitted-Cross-Domain-Policies", "none")
		c.Header("X-Download-Options", "noopen")
		c.Header("X-DNS-Prefetch-Control", "off")

		c.Next()
	}
}

func (sm *SecurityMiddleware) CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !sm.config.CSRF.Enabled {
			sm.logger.Debug("CSRF protection disabled, allowing request")
			c.Next()
			return
		}

		if c.Request.Method == constants.HTTPMethodGET || c.Request.Method == constants.HTTPMethodHEAD || c.Request.Method == constants.HTTPMethodOPTIONS {
			c.Next()
			return
		}

		sm.logger.Debug("Starting CSRF validation",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"origin", c.Request.Header.Get("Origin"),
			"referer", c.Request.Header.Get("Referer"),
		)

		sessionID := sm.getSessionID(c)
		if sessionID == "" {
			sm.logger.Warn("CSRF validation failed: no session ID found",
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"user_id", c.GetString("user_id"),
			)
			c.JSON(http.StatusForbidden, gin.H{
				"error":  constants.ErrMsgCSRFValidationFailed,
				"reason": "No session ID found",
			})
			c.Abort()
			return
		}

		csrfToken := sm.extractCSRFToken(c)
		sm.logger.Debug("Extracted CSRF token",
			"token_found", csrfToken != "",
			"session_id", sessionID,
		)

		result := sm.csrfService.ValidateToken(csrfToken, sessionID, c.Request)
		if !result.Valid {
			sm.logger.Warn("CSRF validation failed",
				"reason", result.Reason,
				"session_id", sessionID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"ip", c.ClientIP(),
				"token_present", csrfToken != "",
				"origin", c.Request.Header.Get("Origin"),
				"referer", c.Request.Header.Get("Referer"),
			)
			c.JSON(http.StatusForbidden, gin.H{
				"error":  constants.ErrMsgCSRFValidationFailed,
				"reason": result.Reason,
			})
			c.Abort()
			return
		}

		sm.logger.Debug("CSRF validation successful", "session_id", sessionID)
		c.Next()
	}
}

func (sm *SecurityMiddleware) XSSProtectionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.Contains(c.GetHeader(constants.HeaderContentType), constants.ContentTypeJSON) {
			c.Next()
			return
		}

		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			sm.logger.Error("Failed to read request body for XSS protection", "error", err)
			c.Next()
			return
		}

		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		var jsonData interface{}
		if err := json.Unmarshal(body, &jsonData); err != nil {
			c.Next()
			return
		}

		sanitizedData := sm.xssService.SanitizeJSON(jsonData)

		sanitizedBody, _ := json.Marshal(sanitizedData)
		if !bytes.Equal(body, sanitizedBody) {
			sm.logger.Info("XSS threats sanitized in request body",
				"original_size", len(body),
				"sanitized_size", len(sanitizedBody),
			)

			c.Request.Body = io.NopCloser(bytes.NewBuffer(sanitizedBody))
			c.Request.ContentLength = int64(len(sanitizedBody))
		}

		c.Next()
	}
}

func (sm *SecurityMiddleware) JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := sm.extractJWTToken(c)

		sm.logger.Debug("JWT Auth Debug",
			"has_auth_header", c.GetHeader("Authorization") != "",
			"cookies", func() []string {
				var cookies []string
				for _, cookie := range c.Request.Cookies() {
					val := cookie.Value
					if len(val) > 20 {
						val = val[:20] + "..."
					}
					cookies = append(cookies, cookie.Name+"="+val)
				}
				return cookies
			}(),
			"token_found", token != "",
		)

		if token == "" {
			sm.logger.Warn("JWT token not found - authentication failed",
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"has_cookies", len(c.Request.Cookies()) > 0,
			)
			c.JSON(http.StatusUnauthorized, gin.H{"error": constants.ErrMsgAuthRequired})
			c.Abort()
			return
		}

		claims, err := sm.jwtService.ValidateToken(token, c.Request)
		if err != nil {
			sm.logger.Warn("JWT validation failed",
				"error", err,
				"ip", c.ClientIP(),
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"user_agent", c.Request.UserAgent(),
				"token_present", token != "",
				"token_length", len(token),
			)
			c.JSON(http.StatusUnauthorized, gin.H{"error": constants.ErrMsgInvalidToken})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("userID", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("userEmail", claims.Email)
		c.Set("user_roles", claims.Roles)
		c.Set("userRoles", claims.Roles)
		c.Set("session_id", claims.SessionID)
		c.Set("token_claims", claims)

		isAdmin := false
		for _, roleName := range claims.Roles {
			if roleName == constants.RoleAdmin {
				isAdmin = true
				break
			}
		}
		c.Set("isAdmin", isAdmin)

		sm.logger.Debug("JWT authentication successful",
			"user_id", claims.UserID,
			"session_id", claims.SessionID,
		)

		c.Next()
	}
}

func (sm *SecurityMiddleware) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !sm.config.RateLimit.Enabled {
			c.Next()
			return
		}

		clientID := sm.getClientIdentifier(c)

		limit := sm.getRateLimitForEndpoint(c.Request.URL.Path)

		if sm.isRateLimited(clientID, limit) {
			sm.logger.Warn("Rate limit exceeded",
				"client_id", clientID,
				"endpoint", c.Request.URL.Path,
				"limit", limit,
			)

			c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", "60")

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       constants.ErrMsgRateLimitExceeded,
				"retry_after": 60,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func (sm *SecurityMiddleware) CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if origin != "" && sm.isOriginAllowed(origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", strconv.FormatBool(sm.config.CORS.AllowCredentials))
		}

		if len(sm.config.CORS.AllowedMethods) > 0 {
			c.Header("Access-Control-Allow-Methods", strings.Join(sm.config.CORS.AllowedMethods, ", "))
		}

		if len(sm.config.CORS.AllowedHeaders) > 0 {
			c.Header("Access-Control-Allow-Headers", strings.Join(sm.config.CORS.AllowedHeaders, ", "))
		}

		if len(sm.config.CORS.ExposedHeaders) > 0 {
			c.Header("Access-Control-Expose-Headers", strings.Join(sm.config.CORS.ExposedHeaders, ", "))
		}

		if sm.config.CORS.MaxAge > 0 {
			c.Header("Access-Control-Max-Age", strconv.Itoa(sm.config.CORS.MaxAge))
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func (sm *SecurityMiddleware) buildCSPHeader() string {
	var directives []string

	if len(sm.config.CSP.DefaultSrc) > 0 {
		directives = append(directives, fmt.Sprintf("default-src %s", strings.Join(sm.config.CSP.DefaultSrc, " ")))
	}

	if len(sm.config.CSP.ScriptSrc) > 0 {
		directives = append(directives, fmt.Sprintf("script-src %s", strings.Join(sm.config.CSP.ScriptSrc, " ")))
	}

	if len(sm.config.CSP.StyleSrc) > 0 {
		directives = append(directives, fmt.Sprintf("style-src %s", strings.Join(sm.config.CSP.StyleSrc, " ")))
	}

	if len(sm.config.CSP.ImgSrc) > 0 {
		directives = append(directives, fmt.Sprintf("img-src %s", strings.Join(sm.config.CSP.ImgSrc, " ")))
	}

	if len(sm.config.CSP.FontSrc) > 0 {
		directives = append(directives, fmt.Sprintf("font-src %s", strings.Join(sm.config.CSP.FontSrc, " ")))
	}

	if len(sm.config.CSP.ConnectSrc) > 0 {
		directives = append(directives, fmt.Sprintf("connect-src %s", strings.Join(sm.config.CSP.ConnectSrc, " ")))
	}

	if len(sm.config.CSP.MediaSrc) > 0 {
		directives = append(directives, fmt.Sprintf("media-src %s", strings.Join(sm.config.CSP.MediaSrc, " ")))
	}

	if len(sm.config.CSP.FrameSrc) > 0 {
		directives = append(directives, fmt.Sprintf("frame-src %s", strings.Join(sm.config.CSP.FrameSrc, " ")))
	}

	if sm.config.CSP.ReportURI != "" {
		directives = append(directives, fmt.Sprintf("report-uri %s", sm.config.CSP.ReportURI))
	}

	return strings.Join(directives, "; ")
}

func (sm *SecurityMiddleware) getSessionID(c *gin.Context) string {
	if claims, exists := c.Get("token_claims"); exists {
		if jwtClaims, ok := claims.(*SecureJWTClaims); ok {
			sm.logger.Debug("Found session ID from JWT claims", "session_id", jwtClaims.SessionID)
			return jwtClaims.SessionID
		}
	}

	if cookie, err := c.Cookie("session_id"); err == nil {
		sm.logger.Debug("Found session ID from cookie", "session_id", cookie)
		return cookie
	}

	if userID, exists := c.Get("user_id"); exists {
		sessionID := fmt.Sprintf("session_%v", userID)
		sm.logger.Debug("Generated session ID for user", "user_id", userID, "session_id", sessionID)
		return sessionID
	}

	sm.logger.Warn("No session ID found in any source")
	return ""
}

func (sm *SecurityMiddleware) extractCSRFToken(c *gin.Context) string {
	if token := c.GetHeader(sm.config.CSRF.TokenHeaderName); token != "" {
		return token
	}

	if token := c.PostForm(sm.config.CSRF.TokenFieldName); token != "" {
		return token
	}

	if cookie, err := c.Cookie(sm.config.CSRF.TokenFieldName); err == nil {
		return cookie
	}

	return ""
}

func (sm *SecurityMiddleware) extractJWTToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, constants.BearerPrefix) {
		return strings.TrimPrefix(authHeader, constants.BearerPrefix)
	}

	if cookie, err := c.Cookie(constants.AccessTokenCookieName); err == nil {
		return cookie
	}

	return ""
}

func (sm *SecurityMiddleware) getClientIdentifier(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		return fmt.Sprintf("user_%v", userID)
	}

	return fmt.Sprintf("ip_%s", c.ClientIP())
}

func (sm *SecurityMiddleware) getRateLimitForEndpoint(path string) int {
	if strings.Contains(path, "/auth/") {
		return sm.config.RateLimit.AuthRPM
	}

	if strings.Contains(path, "/api/") {
		return sm.config.RateLimit.APIRPM
	}

	return sm.config.RateLimit.PerIPRPM
}

func (sm *SecurityMiddleware) isRateLimited(clientID string, limit int) bool {
	return false
}

func (sm *SecurityMiddleware) isOriginAllowed(origin string) bool {
	for _, allowed := range sm.config.CORS.AllowedOrigins {
		if origin == allowed {
			return true
		}
	}
	return false
}
