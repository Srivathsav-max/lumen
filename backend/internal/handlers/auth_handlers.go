package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/security"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type AuthHandlers struct {
	authService    services.AuthService
	userService    services.UserService
	jwtService     *security.JWTService
	csrfService    *security.CSRFService
	xssService     *security.XSSService
	securityConfig *security.SecurityConfig
	logger         *slog.Logger
}

func NewAuthHandlers(authService services.AuthService, userService services.UserService, securityConfig *security.SecurityConfig, logger *slog.Logger) *AuthHandlers {
	jwtService := security.NewJWTService(&securityConfig.JWT, logger)
	csrfService := security.NewCSRFService(&securityConfig.CSRF, logger)
	xssService := security.NewXSSService(security.DefaultXSSConfig(), logger)

	return &AuthHandlers{
		authService:    authService,
		userService:    userService,
		jwtService:     jwtService,
		csrfService:    csrfService,
		xssService:     xssService,
		securityConfig: securityConfig,
		logger:         logger,
	}
}

func (h *AuthHandlers) Register(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	req.Email = h.xssService.SanitizeInput(req.Email).Sanitized
	req.Username = h.xssService.SanitizeInput(req.Username).Sanitized
	req.FirstName = h.xssService.SanitizeInput(req.FirstName).Sanitized
	req.LastName = h.xssService.SanitizeInput(req.LastName).Sanitized

	if threats := h.validateRegistrationInput(&req); len(threats) > 0 {
		h.logger.Warn("Registration attempt with suspicious input",
			"threats", threats,
			"ip", c.ClientIP(),
		)
		c.Error(errors.NewValidationError("Invalid input detected", "Please check your input and try again"))
		return
	}

	ctx := context.Background()

	userResponse, err := h.userService.Register(ctx, &req)
	if err != nil {
		h.logger.Warn("User registration failed",
			"email", req.Email,
			"username", req.Username,
			"ip", c.ClientIP(),
			"error", err,
		)
		c.Error(err)
		return
	}

	userRoles := userResponse.Roles
	if len(userRoles) == 0 {
		userRoles = []string{"free"}
	}

	secureTokenPair, err := h.jwtService.GenerateTokenPair(userResponse.ID, userResponse.Email, userRoles, c.Request)
	if err != nil {
		h.logger.Error("Failed to generate secure JWT token", "error", err, "user_id", userResponse.ID)
		c.Error(errors.NewInternalError("Registration failed"))
		return
	}

	regClaims, err := h.jwtService.ValidateToken(secureTokenPair.AccessToken, c.Request)
	if err != nil {
		h.logger.Error("Failed to parse generated token", "error", err)
		c.Error(errors.NewInternalError("Registration failed"))
		return
	}

	csrfToken, err := h.csrfService.GenerateToken(regClaims.SessionID, userResponse.ID, c.Request)

	var csrfTokenValue string
	var csrfEnabled bool = true

	if err != nil {
		if err.Error() == constants.ErrMsgCSRFDisabled {
			h.logger.Debug("CSRF protection is disabled, skipping CSRF token generation", "user_id", userResponse.ID)
			csrfTokenValue = constants.DevCSRFTokenDisabled
			csrfEnabled = false
			h.setSecureAuthCookiesWithoutCSRF(c, secureTokenPair.AccessToken)
		} else {
			h.logger.Error("Failed to generate CSRF token", "error", err, "user_id", userResponse.ID)
			c.Error(errors.NewInternalError("Registration failed"))
			return
		}
	} else {
		csrfTokenValue = csrfToken.Token
		h.setSecureAuthCookies(c, secureTokenPair.AccessToken, csrfToken)
	}

	secureAuthResponse := gin.H{
		"user": gin.H{
			"id":         userResponse.ID,
			"email":      userResponse.Email,
			"username":   userResponse.Username,
			"first_name": userResponse.FirstName,
			"last_name":  userResponse.LastName,
			"roles":      regClaims.Roles,
			"is_admin":   contains(regClaims.Roles, constants.RoleAdmin),
			"created_at": userResponse.CreatedAt,
		},
		"expires_in":   secureTokenPair.ExpiresIn,
		"token_type":   "Bearer",
		"csrf_token":   csrfTokenValue,
		"csrf_enabled": csrfEnabled,
	}

	h.logger.Info("User registered successfully",
		"user_id", userResponse.ID,
		"session_id", regClaims.SessionID,
		"ip", c.ClientIP(),
	)

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"data":    secureAuthResponse,
	})
}

func (h *AuthHandlers) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	req.Email = h.xssService.SanitizeInput(req.Email).Sanitized

	ctx := context.Background()

	authResponse, err := h.userService.Login(ctx, &req)
	if err != nil {
		h.logger.Warn("Login attempt failed",
			"email", req.Email,
			"ip", c.ClientIP(),
			"error", err,
		)
		c.Error(err)
		return
	}

	userRoles := authResponse.User.Roles
	if len(userRoles) == 0 {
		userRoles = []string{"free"}
	}

	secureTokenPair, err := h.jwtService.GenerateTokenPair(authResponse.User.ID, authResponse.User.Email, userRoles, c.Request)
	if err != nil {
		h.logger.Error("Failed to generate secure JWT token", "error", err, "user_id", authResponse.User.ID)
		c.Error(errors.NewInternalError("Authentication failed"))
		return
	}

	claims, err := h.jwtService.ValidateToken(secureTokenPair.AccessToken, c.Request)
	if err != nil {
		h.logger.Error("Failed to parse generated token", "error", err)
		c.Error(errors.NewInternalError("Authentication failed"))
		return
	}

	csrfToken, err := h.csrfService.GenerateToken(claims.SessionID, authResponse.User.ID, c.Request)

	var csrfTokenValue string
	var csrfEnabled bool = true

	if err != nil {
		if err.Error() == constants.ErrMsgCSRFDisabled {
			h.logger.Debug("CSRF protection is disabled, skipping CSRF token generation", "user_id", authResponse.User.ID)
			csrfTokenValue = constants.DevCSRFTokenDisabled
			csrfEnabled = false
			h.setSecureAuthCookiesWithoutCSRF(c, secureTokenPair.AccessToken)
		} else {
			h.logger.Error("Failed to generate CSRF token", "error", err, "user_id", authResponse.User.ID)
			c.Error(errors.NewInternalError("Authentication failed"))
			return
		}
	} else {
		csrfTokenValue = csrfToken.Token
		h.setSecureAuthCookies(c, secureTokenPair.AccessToken, csrfToken)
	}

	secureAuthResponse := gin.H{
		"user": gin.H{
			"id":         authResponse.User.ID,
			"email":      authResponse.User.Email,
			"username":   authResponse.User.Username,
			"first_name": authResponse.User.FirstName,
			"last_name":  authResponse.User.LastName,
			"roles":      claims.Roles,
			"is_admin":   contains(claims.Roles, "admin"),
			"created_at": authResponse.User.CreatedAt,
		},
		"expires_in":   secureTokenPair.ExpiresIn,
		"token_type":   "Bearer",
		"csrf_token":   csrfTokenValue,
		"csrf_enabled": csrfEnabled,
	}

	h.logger.Info("User logged in successfully",
		"user_id", authResponse.User.ID,
		"session_id", claims.SessionID,
		"ip", c.ClientIP(),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"data":    secureAuthResponse,
	})
}

func (h *AuthHandlers) ValidateToken(c *gin.Context) {
	token := h.extractToken(c)
	if token == "" {
		c.Error(errors.NewAuthenticationError("Authentication token is required"))
		return
	}

	ctx := context.Background()

	claims, err := h.jwtService.ValidateToken(token, c.Request)
	if err != nil {
		h.logger.Warn("Token validation failed",
			"error", err,
			"ip", c.ClientIP(),
			"user_agent", c.GetHeader("User-Agent"),
		)
		h.clearSecureAuthCookies(c)
		c.Error(errors.NewAuthenticationError("Invalid or expired token"))
		return
	}

	user, err := h.userService.GetByID(ctx, claims.UserID)
	if err != nil {
		h.logger.Warn("User not found during token validation",
			"user_id", claims.UserID,
			"error", err,
		)
		h.clearSecureAuthCookies(c)
		c.Error(err)
		return
	}

	if user == nil {
		h.logger.Warn("Inactive user attempted to use valid token", "user_id", claims.UserID)
		h.clearSecureAuthCookies(c)
		c.Error(errors.NewAuthenticationError("User account is inactive"))
		return
	}

	currentRoles := user.Roles
	if len(currentRoles) == 0 {
		currentRoles = []string{"free"}
	}

	rolesChanged := !h.rolesEqual(claims.Roles, currentRoles)
	if rolesChanged {
		h.logger.Info("User roles have changed since token was issued",
			"user_id", claims.UserID,
			"jwt_roles", claims.Roles,
			"current_roles", currentRoles,
		)
	}

	response := gin.H{
		"valid": true,
		"data": gin.H{
			"user": gin.H{
				"id":         user.ID,
				"email":      user.Email,
				"username":   user.Username,
				"first_name": user.FirstName,
				"last_name":  user.LastName,
				"roles":      currentRoles,
				"is_admin":   contains(currentRoles, "admin"),
			},
			"session_id": claims.SessionID,
			"expires_at": claims.ExpiresAt.Unix(),
			"roles":      currentRoles,
		},
	}

	h.logger.Debug("Token validated successfully",
		"user_id", claims.UserID,
		"session_id", claims.SessionID,
		"roles", currentRoles,
	)

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandlers) RefreshToken(c *gin.Context) {
	// Get refresh token from cookie or request body
	refreshToken, err := c.Cookie(constants.RefreshTokenCookieName)
	if err != nil {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			h.logger.Warn("Invalid refresh token request", "error", err, "ip", c.ClientIP())
			c.Error(errors.NewValidationError("Refresh token is required", ""))
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken == "" {
		c.Error(errors.NewAuthenticationError("Refresh token is required"))
		return
	}

	ctx := context.Background()

	// Use auth service for proper refresh token flow with rotation
	tokenPair, err := h.authService.RefreshTokens(ctx, refreshToken)
	if err != nil {
		h.logger.Warn("Token refresh failed",
			"error", err,
			"ip", c.ClientIP(),
		)
		h.clearSecureAuthCookies(c)
		c.Error(err) // AuthService returns proper error types
		return
	}

	// Parse the new access token to get claims for CSRF
	claims, err := h.jwtService.ValidateToken(tokenPair.AccessToken, c.Request)
	if err != nil {
		h.logger.Error("Failed to parse new access token", "error", err)
		c.Error(errors.NewInternalError("Token refresh failed"))
		return
	}

	// Generate CSRF token for the new session
	var csrfTokenValue string
	var csrfEnabled bool = true

	csrfToken, err := h.csrfService.GenerateToken(claims.SessionID, claims.UserID, c.Request)
	if err != nil {
		if err.Error() == constants.ErrMsgCSRFDisabled {
			h.logger.Debug("CSRF protection is disabled during token refresh", "user_id", claims.UserID)
			csrfTokenValue = constants.DevCSRFTokenDisabled
			csrfEnabled = false
			h.setRefreshTokenCookies(c, tokenPair.AccessToken, tokenPair.RefreshToken)
		} else {
			h.logger.Error("Failed to generate CSRF token during refresh",
				"error", err,
				"user_id", claims.UserID,
			)
			c.Error(errors.NewInternalError("Token refresh failed"))
			return
		}
	} else {
		csrfTokenValue = csrfToken.Token
		h.setRefreshTokenCookiesWithCSRF(c, tokenPair.AccessToken, tokenPair.RefreshToken, csrfToken)
	}

	h.logger.Info("Token refreshed successfully",
		"user_id", claims.UserID,
		"session_id", claims.SessionID,
		"ip", c.ClientIP(),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": constants.MsgTokenRefreshed,
		"data": gin.H{
			"expires_in":   tokenPair.ExpiresIn,
			"token_type":   "Bearer",
			"csrf_token":   csrfTokenValue,
			"csrf_enabled": csrfEnabled,
		},
	})
}

func (h *AuthHandlers) RevokeToken(c *gin.Context) {
	var req struct {
		Token string `json:"token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		req.Token = h.extractToken(c)
		if req.Token == "" {
			c.Error(errors.NewValidationError("Token is required", ""))
			return
		}
	}

	ctx := context.Background()

	if err := h.authService.RevokeToken(ctx, req.Token); err != nil {
		c.Error(err)
		return
	}

	h.clearSecureAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Token revoked successfully",
	})
}

func (h *AuthHandlers) Logout(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	sessionID, _ := c.Get("session_id")

	ctx := context.Background()

	if err := h.authService.InvalidateAllSessions(ctx, userID.(int64)); err != nil {
		h.logger.Error("Failed to invalidate user sessions during logout",
			"error", err,
			"user_id", userID,
		)
	}

	h.clearSecureAuthCookies(c)

	h.logger.Info("User logged out successfully",
		"user_id", userID,
		"session_id", sessionID,
		"ip", c.ClientIP(),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

func (h *AuthHandlers) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.Error(errors.NewAuthenticationError("User not authenticated"))
		return
	}

	var req services.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	if err := h.authService.ChangePassword(ctx, userID.(int64), &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

func (h *AuthHandlers) InitiatePasswordReset(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	if err := h.authService.InitiatePasswordReset(ctx, req.Email); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset instructions sent to your email",
	})
}

func (h *AuthHandlers) ResetPassword(c *gin.Context) {
	var req services.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewValidationError("Invalid request format", err.Error()))
		return
	}

	ctx := context.Background()

	if err := h.authService.ResetPassword(ctx, &req); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
	})
}

func (h *AuthHandlers) extractToken(c *gin.Context) string {
	if token, err := c.Cookie(constants.AccessTokenCookieName); err == nil && token != "" {
		return token
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		h.logger.Warn("Invalid Authorization header format",
			"header", authHeader,
			"ip", c.ClientIP(),
		)
		return ""
	}

	h.logger.Debug("Token extracted from Authorization header",
		"ip", c.ClientIP(),
		"user_agent", c.GetHeader("User-Agent"),
	)

	return parts[1]
}

func (h *AuthHandlers) validateRegistrationInput(req *services.RegisterRequest) []string {
	var threats []string

	if result := h.xssService.SanitizeInput(req.Email); len(result.Threats) > 0 {
		threats = append(threats, result.Threats...)
	}

	if result := h.xssService.SanitizeInput(req.Username); len(result.Threats) > 0 {
		threats = append(threats, result.Threats...)
	}

	if result := h.xssService.SanitizeInput(req.FirstName); len(result.Threats) > 0 {
		threats = append(threats, result.Threats...)
	}

	if result := h.xssService.SanitizeInput(req.LastName); len(result.Threats) > 0 {
		threats = append(threats, result.Threats...)
	}

	return threats
}

func (h *AuthHandlers) GetCSRFToken(c *gin.Context) {
	sessionID, err := c.Cookie("session_id")
	if err != nil || sessionID == "" {
		sessionID = fmt.Sprintf("temp_%d", time.Now().UnixNano())
	}

	csrfToken, err := h.csrfService.GenerateToken(sessionID, 0, c.Request)
	if err != nil {
		if err.Error() == constants.ErrMsgCSRFDisabled {
			c.JSON(http.StatusOK, gin.H{
				"csrf_token":   constants.DevCSRFTokenDisabled,
				"expires_at":   nil,
				"csrf_enabled": false,
			})
			return
		}
		h.logger.Error("Failed to generate CSRF token", "error", err)
		c.Error(errors.NewInternalError("Failed to generate CSRF token"))
		return
	}

	h.csrfService.SetCSRFCookie(c.Writer, csrfToken)

	c.JSON(http.StatusOK, gin.H{
		"csrf_token":   csrfToken.Token,
		"expires_at":   csrfToken.ExpiresAt.Unix(),
		"csrf_enabled": true,
	})
}

func (h *AuthHandlers) setSecureAuthCookies(c *gin.Context, accessToken string, csrfToken *security.CSRFToken) {
	claims, err := h.jwtService.ValidateToken(accessToken, c.Request)
	if err == nil {
		rolesJson := strings.Join(claims.Roles, ",")
		c.SetCookie(
			"user_roles",
			rolesJson,
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)

		c.SetCookie(
			"user_id",
			fmt.Sprintf("%d", claims.UserID),
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)
	}
	c.SetCookie(
		"access_token",
		accessToken,
		int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
		"/",
		"",
		h.securityConfig.Session.SecureCookie,
		true,
	)

	h.csrfService.SetCSRFCookie(c.Writer, csrfToken)

	c.SetCookie(
		"session_id",
		csrfToken.SessionID,
		int(h.securityConfig.Session.Timeout.Seconds()),
		"/",
		"",
		h.securityConfig.Session.SecureCookie,
		true,
	)
}

func (h *AuthHandlers) setSecureAuthCookiesWithoutCSRF(c *gin.Context, accessToken string) {
	claims, err := h.jwtService.ValidateToken(accessToken, c.Request)
	if err == nil {
		rolesJson := strings.Join(claims.Roles, ",")
		c.SetCookie(
			"user_roles",
			rolesJson,
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)

		c.SetCookie(
			"user_id",
			fmt.Sprintf("%d", claims.UserID),
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)

		c.SetCookie(
			"session_id",
			claims.SessionID,
			int(h.securityConfig.Session.Timeout.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			true,
		)
	}

	c.SetCookie(
		"access_token",
		accessToken,
		int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
		"/",
		"",
		h.securityConfig.Session.SecureCookie,
		true,
	)
}

func (h *AuthHandlers) setRefreshTokenCookies(c *gin.Context, accessToken string, refreshToken string) {
	claims, err := h.jwtService.ValidateToken(accessToken, c.Request)
	if err == nil {
		rolesJson := strings.Join(claims.Roles, ",")
		c.SetCookie(
			constants.UserRolesCookieName,
			rolesJson,
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)

		c.SetCookie(
			constants.UserIDCookieName,
			fmt.Sprintf("%d", claims.UserID),
			int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			false,
		)

		c.SetCookie(
			constants.SessionIDCookieName,
			claims.SessionID,
			int(h.securityConfig.Session.Timeout.Seconds()),
			"/",
			"",
			h.securityConfig.Session.SecureCookie,
			true,
		)
	}

	c.SetCookie(
		constants.AccessTokenCookieName,
		accessToken,
		int(h.securityConfig.JWT.AccessTokenDuration.Seconds()),
		"/",
		"",
		h.securityConfig.Session.SecureCookie,
		true,
	)

	c.SetCookie(
		constants.RefreshTokenCookieName,
		refreshToken,
		int(h.securityConfig.JWT.RefreshTokenDuration.Seconds()),
		"/",
		"",
		h.securityConfig.Session.SecureCookie,
		true,
	)
}

func (h *AuthHandlers) setRefreshTokenCookiesWithCSRF(c *gin.Context, accessToken string, refreshToken string, csrfToken *security.CSRFToken) {
	h.setRefreshTokenCookies(c, accessToken, refreshToken)

	h.csrfService.SetCSRFCookie(c.Writer, csrfToken)
}

func (h *AuthHandlers) clearSecureAuthCookies(c *gin.Context) {
	c.SetCookie(constants.AccessTokenCookieName, "", -1, "/", "", h.securityConfig.Session.SecureCookie, true)

	c.SetCookie(constants.RefreshTokenCookieName, "", -1, "/", "", h.securityConfig.Session.SecureCookie, true)

	h.csrfService.ClearCSRFCookie(c.Writer)

	c.SetCookie(constants.SessionIDCookieName, "", -1, "/", "", h.securityConfig.Session.SecureCookie, true)

	c.SetCookie(constants.UserRolesCookieName, "", -1, "/", "", h.securityConfig.Session.SecureCookie, false)
	c.SetCookie(constants.UserIDCookieName, "", -1, "/", "", h.securityConfig.Session.SecureCookie, false)

	c.SetCookie("fingerprint", "", -1, "/", "", h.securityConfig.Session.SecureCookie, true)
}

func contains(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

func (h *AuthHandlers) rolesEqual(roles1, roles2 []string) bool {
	if len(roles1) != len(roles2) {
		return false
	}

	roleMap1 := make(map[string]bool)
	roleMap2 := make(map[string]bool)

	for _, role := range roles1 {
		roleMap1[role] = true
	}

	for _, role := range roles2 {
		roleMap2[role] = true
	}

	for role := range roleMap1 {
		if !roleMap2[role] {
			return false
		}
	}

	return true
}
