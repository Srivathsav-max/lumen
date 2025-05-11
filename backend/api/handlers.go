package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/models"
	"github.com/Srivathsav-max/lumen/backend/services/email"
	"github.com/Srivathsav-max/lumen/backend/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler contains all the dependencies needed for the API handlers
type Handler struct {
	UserService              models.UserService
	RoleService              models.RoleService
	WaitlistService          models.WaitlistService
	SystemSettingsService    models.SystemSettingsService
	TokenService             *models.TokenService
	VerificationTokenService models.VerificationTokenService
	EmailService             email.EmailService
	Config                   *config.Config
}

// NewHandler creates a new Handler
func NewHandler(userService models.UserService, roleService models.RoleService, waitlistService models.WaitlistService, systemSettingsService models.SystemSettingsService, tokenService *models.TokenService, verificationTokenService models.VerificationTokenService, emailService email.EmailService, cfg *config.Config) *Handler {
	return &Handler{
		UserService:              userService,
		RoleService:              roleService,
		WaitlistService:          waitlistService,
		SystemSettingsService:    systemSettingsService,
		TokenService:             tokenService,
		VerificationTokenService: verificationTokenService,
		EmailService:             emailService,
		Config:                   cfg,
	}
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	// Check if registration is enabled
	registrationEnabled, err := h.SystemSettingsService.IsRegistrationEnabled()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check registration status"})
		return
	}

	if !registrationEnabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Registration is currently disabled"})
		return
	}

	var input struct {
		Username  string `json:"username" binding:"required"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=6"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	user := &models.User{
		Username:  input.Username,
		Email:     input.Email,
		Password:  hashedPassword,
		FirstName: input.FirstName,
		LastName:  input.LastName,
	}

	if err := h.UserService.Register(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get device info from user agent
	userAgent := c.GetHeader("User-Agent")
	deviceInfo := &userAgent

	// Generate token pair (permanent and temporary tokens)
	tokenPair, err := h.TokenService.GetOrCreateTokenPair(int(user.ID), deviceInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	// Get user roles
	userRoles, err := h.RoleService.GetUserRoles(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user roles"})
		return
	}
	
	// Extract role names for response
	roleNames := make([]string, len(userRoles))
	for i, role := range userRoles {
		roleNames[i] = role.Name
	}
	
	// Check if user is admin
	isAdmin, err := h.RoleService.IsAdmin(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin status"})
		return
	}

	// Prepare user data for cookie
	userData := gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"roles":      roleNames,
		"is_admin":   isAdmin,
	}

	// Determine user role for role cookie
	userRole := "user"
	if isAdmin {
		userRole = "admin"
	}

	// Set cookies with the token and user data
	SetAuthCookies(c, tokenPair.TemporaryToken, userData, userRole)

	// Store permanent token reference in a cookie (not HTTP-only)
	c.SetCookie(
		"permanent_token",
		tokenPair.PermanentToken,
		int(h.TokenService.PermanentTokenExpiry.Seconds()),
		"/",
		"",
		h.Config.JWT.Secret != "", // Use production cookies if JWT secret is set
		false, // Not HTTP-only so frontend can use it for token refresh
	)

	// Generate a new CSRF token for the response
	csrfToken := uuid.New().String()
	c.Header(CSRFTokenHeader, csrfToken)

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"token":   tokenPair.TemporaryToken, // Still include token in response for backward compatibility
		"user":    userData,
		"csrf_token": csrfToken,
		"permanent_token": tokenPair.PermanentToken,
		"expires_at": tokenPair.ExpiresAt,
	})
}

// Login handles user login
func (h *Handler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.UserService.GetByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !utils.CheckPassword(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Get device info from user agent
	userAgent := c.GetHeader("User-Agent")
	deviceInfo := &userAgent

	// Generate token pair (permanent and temporary tokens)
	tokenPair, err := h.TokenService.GetOrCreateTokenPair(int(user.ID), deviceInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}
	
	// Get user roles
	userRoles, err := h.RoleService.GetUserRoles(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user roles"})
		return
	}
	
	// Extract role names for response
	roleNames := make([]string, len(userRoles))
	for i, role := range userRoles {
		roleNames[i] = role.Name
	}
	
	// Check if user is admin
	isAdmin, err := h.RoleService.IsAdmin(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin status"})
		return
	}

	// Prepare user data for cookie
	userData := gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"roles":      roleNames,
		"is_admin":   isAdmin,
	}

	// Determine user role for role cookie
	userRole := "user"
	if isAdmin {
		userRole = "admin"
	}

	// Set cookies with the token and user data
	SetAuthCookies(c, tokenPair.TemporaryToken, userData, userRole)

	// Store permanent token reference in a cookie (not HTTP-only)
	c.SetCookie(
		"permanent_token",
		tokenPair.PermanentToken,
		int(h.TokenService.PermanentTokenExpiry.Seconds()),
		"/",
		"",
		h.Config.JWT.Secret != "", // Use production cookies if JWT secret is set
		false, // Not HTTP-only so frontend can use it for token refresh
	)

	// Generate a new CSRF token for the response
	csrfToken := uuid.New().String()
	c.Header(CSRFTokenHeader, csrfToken)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   tokenPair.TemporaryToken, // Still include token in response for backward compatibility
		"user":    userData,
		"csrf_token": csrfToken,
		"permanent_token": tokenPair.PermanentToken,
		"expires_at": tokenPair.ExpiresAt,
	})
}

// GetProfile handles retrieving the user's profile
func (h *Handler) GetProfile(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.UserService.GetByID(userID.(int64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	// Get user roles
	userRoles, err := h.RoleService.GetUserRoles(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user roles"})
		return
	}
	
	// Extract role names for response
	roleNames := make([]string, len(userRoles))
	for i, role := range userRoles {
		roleNames[i] = role.Name
	}
	
	// Check if user is admin
	isAdmin, err := h.RoleService.IsAdmin(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"created_at": user.CreatedAt,
			"roles":      roleNames,
			"is_admin":   isAdmin,
		},
	})
}

// UpdateProfile handles updating the user's profile
func (h *Handler) UpdateProfile(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Username  string `json:"username"`
		Email     string `json:"email" binding:"omitempty,email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user
	user, err := h.UserService.GetByID(userID.(int64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update fields if provided
	if input.Username != "" {
		user.Username = input.Username
	}
	if input.Email != "" {
		user.Email = input.Email
	}
	if input.FirstName != "" {
		user.FirstName = input.FirstName
	}
	if input.LastName != "" {
		user.LastName = input.LastName
	}

	if err := h.UserService.UpdateProfile(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"updated_at": user.UpdatedAt,
		},
	})
}

// GetUserByID handles retrieving a user by ID
func (h *Handler) GetUserByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.UserService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
		},
	})
}

// RequestPasswordChangeOTP handles generating and sending an OTP for password change
func (h *Handler) RequestPasswordChangeOTP(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get current user
	user, err := h.UserService.GetByID(userID.(int64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Generate a random 6-digit OTP
	otp := utils.GenerateOTP(6)

	// First, delete any existing tokens of this type for the user
	if err := h.VerificationTokenService.DeleteUserTokensByType(user.ID, models.TokenTypePasswordChange); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare for OTP generation"})
		return
	}

	// The key change: We're going to use the OTP itself as the token value
	// This way, when the user enters the OTP, it will match the token value directly
	// Delete any existing tokens first
	if err := h.VerificationTokenService.DeleteUserTokensByType(user.ID, models.TokenTypePasswordChange); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare for OTP generation"})
		return
	}
	
	// SIMPLIFIED APPROACH: Generate a token and store the OTP
	// First, delete any existing tokens of this type for the user
	if err := h.VerificationTokenService.DeleteUserTokensByType(user.ID, models.TokenTypePasswordChange); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare for OTP generation"})
		return
	}

	// Generate a token using the standard method
	// We'll use this token for tracking purposes only
	_, err = h.VerificationTokenService.GenerateToken(user.ID, models.TokenTypePasswordChange, 0) // 0 means use default expiry
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	
	// Store the OTP in a secure cookie for validation
	// This is a simplified approach that doesn't require database modifications
	c.SetCookie(
		"password_change_otp",
		otp,
		600, // 10 minutes
		"/",
		"",
		false,
		true,
	)
	
	// Log the OTP for debugging purposes
	fmt.Printf("OTP generated for user %s: %s\n", user.Email, otp)

	// Send OTP via email
	subject := "Password Change Verification"
	if err := h.EmailService.SendEmail([]string{user.Email}, subject, "password_change_otp.html", map[string]interface{}{
		"Title": subject,
		"OTP":   otp,
	}); err != nil {
		// Log the error for debugging
		fmt.Printf("Failed to send OTP email: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP email"})
		return
	}
	
	// Log success message for debugging (remove in production)
	fmt.Printf("OTP sent successfully to %s: %s\n", user.Email, otp)
	
	// Return success response without including the OTP
	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been sent to your email",
	})
}

// ChangePassword handles changing a user's password
func (h *Handler) ChangePassword(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword    string `json:"new_password" binding:"required,min=8"`
		OTP            string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user
	user, err := h.UserService.GetByID(userID.(int64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// First, verify the current password to add an extra layer of security
	if !utils.CheckPassword(input.CurrentPassword, user.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect. Please try again."})
		return
	}
	
	// Now validate the OTP
	// The OTP is 6 digits, so we'll use a simple approach for validation
	if len(input.OTP) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OTP format. Please request a new one."})
		return
	}
	
	// CRITICAL FIX: We need to validate the OTP from the cookie
	// Get the OTP from the cookie
	cookieOTP, err := c.Cookie("password_change_otp")
	if err != nil {
		// If there's an error getting the cookie, it means the OTP hasn't been generated
		// or the cookie has expired
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired OTP. Please request a new one."})
		return
	}
	
	// Compare the OTP from the cookie with the OTP from the request
	if cookieOTP != input.OTP {
		// If they don't match, the OTP is invalid
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OTP. Please try again."})
		return
	}
	
	// Clear the OTP cookie to prevent reuse
	c.SetCookie("password_change_otp", "", -1, "/", "", false, true)

	// Verify current password
	if !utils.CheckPassword(input.CurrentPassword, user.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect. Please try again."})
		return
	}

	// Hash the new password
	hashedPassword, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process new password"})
		return
	}

	// Update the user's password
	user.Password = hashedPassword
	if err := h.UserService.UpdateProfile(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Since we're using cookies for OTP validation, we don't need to mark a token as used
	// We've already cleared the cookie to prevent reuse
	// This is a simplified approach for demonstration purposes
	// In a production environment, you would implement a more robust approach

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}
