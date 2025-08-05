package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html/template"
	"net/smtp"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type EmailServiceImpl struct {
	config     *config.EmailConfig
	userRepo   repository.UserRepository
	tokenRepo  repository.VerificationTokenRepository
	logger     *slog.Logger
	templates  map[string]*template.Template
	smtpClient SMTPClient
}

// SMTPClient interface for SMTP operations (for testing)
type SMTPClient interface {
	SendMail(addr string, auth smtp.Auth, from string, to []string, msg []byte) error
}

// DefaultSMTPClient implements SMTPClient using the standard smtp package
type DefaultSMTPClient struct{}

func (c *DefaultSMTPClient) SendMail(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	return smtp.SendMail(addr, auth, from, to, msg)
}

// EmailTemplate represents an email template with metadata
type EmailTemplate struct {
	Name        string
	Subject     string
	Template    *template.Template
	RequiredFields []string
}

// EmailData represents common data for email templates
type EmailData struct {
	AppName     string
	BaseURL     string
	SupportEmail string
	Year        int
}

// VerificationEmailData represents data for verification emails
type VerificationEmailData struct {
	EmailData
	Username         string
	VerificationLink string
	ExpirationHours  int
}

// PasswordResetEmailData represents data for password reset emails
type PasswordResetEmailData struct {
	EmailData
	Username         string
	ResetLink        string
	ExpirationHours  int
}

// WelcomeEmailData represents data for welcome emails
type WelcomeEmailData struct {
	EmailData
	Username    string
	LoginURL    string
	DashboardURL string
}

// NewEmailService creates a new email service instance
func NewEmailService(
	config *config.EmailConfig,
	userRepo repository.UserRepository,
	tokenRepo repository.VerificationTokenRepository,
	logger *slog.Logger,
) (*EmailServiceImpl, error) {
	service := &EmailServiceImpl{
		config:     config,
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		logger:     logger,
		templates:  make(map[string]*template.Template),
		smtpClient: &DefaultSMTPClient{},
	}

	// Load email templates
	if err := service.loadTemplates(); err != nil {
		return nil, fmt.Errorf("failed to load email templates: %w", err)
	}

	return service, nil
}

// SendVerificationEmail sends an email verification link to the user
func (s *EmailServiceImpl) SendVerificationEmail(ctx context.Context, userID int64, email string) error {
	// Get user information
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for verification email",
			"user_id", userID,
			"error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	// Generate verification token
	tokenString, err := s.generateSecureToken()
	if err != nil {
		s.logger.Error("Failed to generate secure token",
			"user_id", userID,
			"error", err)
		return errors.NewInternalError("Failed to generate verification token").WithCause(err)
	}

	token := &repository.VerificationToken{
		UserID:    userID,
		Token:     tokenString,
		TokenType: "email_verification",
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
		IsUsed:    false,
	}

	if err := s.tokenRepo.Create(ctx, token); err != nil {
		s.logger.Error("Failed to create verification token",
			"user_id", userID,
			"error", err)
		return errors.NewInternalError("Failed to generate verification token").WithCause(err)
	}

	// Prepare template data
	data := VerificationEmailData{
		EmailData: EmailData{
			AppName:      "Lumen",
			BaseURL:      s.getBaseURL(),
			SupportEmail: s.config.FromEmail,
			Year:         time.Now().Year(),
		},
		Username:         user.Username,
		VerificationLink: fmt.Sprintf("%s/auth/verify-email?token=%s", s.getBaseURL(), tokenString),
		ExpirationHours:  24,
	}

	// Send email with retry mechanism
	return s.sendEmailWithRetry(ctx, []string{email}, "Verify Your Email Address", "verification.html", data, 3)
}

// SendPasswordResetEmail sends a password reset link to the user
func (s *EmailServiceImpl) SendPasswordResetEmail(ctx context.Context, userID int64, email string, resetToken string) error {
	// Get user information
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for password reset email",
			"user_id", userID,
			"error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

	// Prepare template data
	data := PasswordResetEmailData{
		EmailData: EmailData{
			AppName:      "Lumen",
			BaseURL:      s.getBaseURL(),
			SupportEmail: s.config.FromEmail,
			Year:         time.Now().Year(),
		},
		Username:        user.Username,
		ResetLink:       fmt.Sprintf("%s/auth/reset-password?token=%s", s.getBaseURL(), resetToken),
		ExpirationHours: 1,
	}

	// Send email with retry mechanism
	return s.sendEmailWithRetry(ctx, []string{email}, "Reset Your Password", "password_reset.html", data, 3)
}

// SendWelcomeEmail sends a welcome email to newly registered users
func (s *EmailServiceImpl) SendWelcomeEmail(ctx context.Context, userID int64, email, username string) error {
	// Prepare template data
	data := WelcomeEmailData{
		EmailData: EmailData{
			AppName:      "Lumen",
			BaseURL:      s.getBaseURL(),
			SupportEmail: s.config.FromEmail,
			Year:         time.Now().Year(),
		},
		Username:     username,
		LoginURL:     fmt.Sprintf("%s/auth/login", s.getBaseURL()),
		DashboardURL: fmt.Sprintf("%s/dashboard", s.getBaseURL()),
	}

	// Send email with retry mechanism
	return s.sendEmailWithRetry(ctx, []string{email}, "Welcome to Lumen", "welcome.html", data, 3)
}

// RenderTemplate renders an email template with the provided data
func (s *EmailServiceImpl) RenderTemplate(templateName string, data interface{}) (string, error) {
	template, exists := s.templates[templateName]
	if !exists {
		return "", NewEmailTemplateError(templateName, fmt.Errorf("template not found"))
	}

	var buf bytes.Buffer
	if err := template.Execute(&buf, data); err != nil {
		return "", NewEmailTemplateError(templateName, err)
	}

	return buf.String(), nil
}

// ValidateEmailAddress validates an email address format
func (s *EmailServiceImpl) ValidateEmailAddress(email string) error {
	// Basic email validation regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	
	if !emailRegex.MatchString(email) {
		return NewInvalidEmailAddressError(email)
	}

	// Additional checks
	if len(email) > 254 {
		return NewInvalidEmailAddressError(email)
	}

	// Check for common invalid patterns
	if strings.Contains(email, "..") || strings.HasPrefix(email, ".") || strings.HasSuffix(email, ".") {
		return NewInvalidEmailAddressError(email)
	}

	return nil
}

// sendEmailWithRetry sends an email with retry mechanism
func (s *EmailServiceImpl) sendEmailWithRetry(ctx context.Context, to []string, subject, templateName string, data interface{}, maxRetries int) error {
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := s.sendEmail(ctx, to, subject, templateName, data)
		if err == nil {
			s.logger.Info("Email sent successfully",
				"recipients", to,
				"subject", subject,
				"template", templateName,
				"attempt", attempt)
			return nil
		}

		lastErr = err
		s.logger.Warn("Email sending failed, retrying",
			"recipients", to,
			"subject", subject,
			"template", templateName,
			"attempt", attempt,
			"max_retries", maxRetries,
			"error", err)

		// Exponential backoff
		if attempt < maxRetries {
			backoffDuration := time.Duration(attempt*attempt) * time.Second
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoffDuration):
				// Continue to next attempt
			}
		}
	}

	s.logger.Error("Email sending failed after all retries",
		"recipients", to,
		"subject", subject,
		"template", templateName,
		"max_retries", maxRetries,
		"error", lastErr)

	return NewEmailDeliveryError(strings.Join(to, ", "), lastErr)
}

// sendEmail sends an email using the specified template
func (s *EmailServiceImpl) sendEmail(ctx context.Context, to []string, subject, templateName string, data interface{}) error {
	// Validate email addresses
	for _, email := range to {
		if err := s.ValidateEmailAddress(email); err != nil {
			return err
		}
	}

	// Render email template
	body, err := s.RenderTemplate(templateName, data)
	if err != nil {
		return err
	}

	// Set up SMTP authentication
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	// Compose email message
	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	headers := map[string]string{
		"From":         from,
		"To":           strings.Join(to, ", "),
		"Subject":      subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/html; charset=UTF-8",
		"Date":         time.Now().Format(time.RFC1123Z),
	}

	// Build message
	var msgBuilder strings.Builder
	for key, value := range headers {
		msgBuilder.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
	}
	msgBuilder.WriteString("\r\n")
	msgBuilder.WriteString(body)

	message := []byte(msgBuilder.String())

	// Send email
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)
	if err := s.smtpClient.SendMail(addr, auth, s.config.FromEmail, to, message); err != nil {
		return fmt.Errorf("SMTP send failed: %w", err)
	}

	return nil
}

// loadTemplates loads all email templates from the templates directory
func (s *EmailServiceImpl) loadTemplates() error {
	templateFiles := []string{
		"verification.html",
		"password_reset.html",
		"welcome.html",
	}

	for _, filename := range templateFiles {
		templatePath := filepath.Join(s.config.TemplatesDir, filename)
		
		tmpl, err := template.ParseFiles(templatePath)
		if err != nil {
			return fmt.Errorf("failed to parse template %s: %w", filename, err)
		}

		s.templates[filename] = tmpl
		s.logger.Debug("Loaded email template", "template", filename, "path", templatePath)
	}

	return nil
}

// getBaseURL returns the base URL for the application
func (s *EmailServiceImpl) getBaseURL() string {
	// This should be configurable, but for now we'll use a default
	// In production, this should come from configuration
	return "https://lumen-app.com" // TODO: Make this configurable
}

// generateSecureToken generates a cryptographically secure random token
func (s *EmailServiceImpl) generateSecureToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// Health check for email service
func (s *EmailServiceImpl) HealthCheck(ctx context.Context) error {
	// Try to connect to SMTP server
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)
	
	// Create a simple connection test
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
	
	// This is a basic connectivity test
	// In a real implementation, you might want to use a more sophisticated health check
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	return nil
}