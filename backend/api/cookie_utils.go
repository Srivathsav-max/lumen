package api

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Cookie names
const (
	AuthTokenCookie = "auth_token"
	UserDataCookie  = "user_data"
	UserRoleCookie  = "user_role"
	CSRFTokenCookie = "csrf_token"
	CSRFTokenHeader = "X-CSRF-Token"
)

// Cookie options
var (
	// 7 days in seconds
	maxAge = 60 * 60 * 24 * 7
)

// SetAuthCookies sets authentication cookies
func SetAuthCookies(c *gin.Context, token string, userData map[string]interface{}, userRole string) {
	// Set HTTP-only cookie for auth token (secure)
	c.SetCookie(
		AuthTokenCookie,
		token,
		maxAge,
		"/",
		"",
		false, // Set to true in production
		true,  // HTTP-only
	)

	// Set regular cookie for user data (not HTTP-only so client can access)
	userDataJSON, _ := json.Marshal(userData)
	c.SetCookie(
		UserDataCookie,
		string(userDataJSON),
		maxAge,
		"/",
		"",
		false, // Set to true in production
		false, // Not HTTP-only
	)

	// Set role cookie if provided
	if userRole != "" {
		c.SetCookie(
			UserRoleCookie,
			userRole,
			maxAge,
			"/",
			"",
			false, // Set to true in production
			false, // Not HTTP-only
		)
	}

	// Generate and set CSRF token
	csrfToken := uuid.New().String()
	c.SetCookie(
		CSRFTokenCookie,
		csrfToken,
		maxAge,
		"/",
		"",
		false, // Set to true in production
		false, // Not HTTP-only so JS can access it
	)

	// Also include CSRF token in response header
	c.Header(CSRFTokenHeader, csrfToken)
}

// ClearAuthCookies clears all authentication cookies
func ClearAuthCookies(c *gin.Context) {
	// Clear auth token cookie
	c.SetCookie(
		AuthTokenCookie,
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	// Clear user data cookie
	c.SetCookie(
		UserDataCookie,
		"",
		-1,
		"/",
		"",
		false,
		false,
	)

	// Clear user role cookie
	c.SetCookie(
		UserRoleCookie,
		"",
		-1,
		"/",
		"",
		false,
		false,
	)

	// Clear CSRF token cookie
	c.SetCookie(
		CSRFTokenCookie,
		"",
		-1,
		"/",
		"",
		false,
		false,
	)
}

// ValidateCSRFToken validates the CSRF token
func ValidateCSRFToken(c *gin.Context) bool {
	// Get CSRF token from request header
	headerToken := c.GetHeader(CSRFTokenHeader)
	if headerToken == "" {
		return false
	}

	// Get CSRF token from cookie
	cookieToken, err := c.Cookie(CSRFTokenCookie)
	if err != nil {
		return false
	}

	// Compare tokens
	return headerToken == cookieToken
}
