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

type SMTPClient interface {
	SendMail(addr string, auth smtp.Auth, from string, to []string, msg []byte) error
}

type DefaultSMTPClient struct{}

func (c *DefaultSMTPClient) SendMail(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	return smtp.SendMail(addr, auth, from, to, msg)
}

type EmailTemplate struct {
	Name           string
	Subject        string
	Template       *template.Template
	RequiredFields []string
}

type EmailData struct {
	AppName      string
	BaseURL      string
	SupportEmail string
	Year         int
}

type VerificationEmailData struct {
	EmailData
	Username         string
	VerificationLink string
	ExpirationHours  int
}

type PasswordResetEmailData struct {
	EmailData
	Username        string
	ResetLink       string
	ExpirationHours int
}

type WelcomeEmailData struct {
	EmailData
	Username     string
	LoginURL     string
	DashboardURL string
}

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

	if err := service.loadTemplates(); err != nil {
		return nil, fmt.Errorf("failed to load email templates: %w", err)
	}

	return service, nil
}

func (s *EmailServiceImpl) SendVerificationEmail(ctx context.Context, userID int64, email string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for verification email",
			"user_id", userID,
			"error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

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

	return s.sendEmailWithRetry(ctx, []string{email}, "Verify Your Email Address", "verification.html", data, 3)
}

func (s *EmailServiceImpl) SendPasswordResetEmail(ctx context.Context, userID int64, email string, resetToken string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for password reset email",
			"user_id", userID,
			"error", err)
		return NewUserNotFoundError(fmt.Sprintf("ID: %d", userID))
	}

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

	return s.sendEmailWithRetry(ctx, []string{email}, "Reset Your Password", "password_reset.html", data, 3)
}

func (s *EmailServiceImpl) SendWelcomeEmail(ctx context.Context, userID int64, email, username string) error {
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

	return s.sendEmailWithRetry(ctx, []string{email}, "Welcome to Lumen", "welcome.html", data, 3)
}

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

func (s *EmailServiceImpl) ValidateEmailAddress(email string) error {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	if !emailRegex.MatchString(email) {
		return NewInvalidEmailAddressError(email)
	}

	if len(email) > 254 {
		return NewInvalidEmailAddressError(email)
	}

	if strings.Contains(email, "..") || strings.HasPrefix(email, ".") || strings.HasSuffix(email, ".") {
		return NewInvalidEmailAddressError(email)
	}

	return nil
}

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

		if attempt < maxRetries {
			backoffDuration := time.Duration(attempt*attempt) * time.Second
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoffDuration):
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

func (s *EmailServiceImpl) sendEmail(ctx context.Context, to []string, subject, templateName string, data interface{}) error {
	for _, email := range to {
		if err := s.ValidateEmailAddress(email); err != nil {
			return err
		}
	}

	body, err := s.RenderTemplate(templateName, data)
	if err != nil {
		return err
	}

	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	headers := map[string]string{
		"From":         from,
		"To":           strings.Join(to, ", "),
		"Subject":      subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/html; charset=UTF-8",
		"Date":         time.Now().Format(time.RFC1123Z),
	}

	var msgBuilder strings.Builder
	for key, value := range headers {
		msgBuilder.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
	}
	msgBuilder.WriteString("\r\n")
	msgBuilder.WriteString(body)

	message := []byte(msgBuilder.String())

	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)
	if err := s.smtpClient.SendMail(addr, auth, s.config.FromEmail, to, message); err != nil {
		return fmt.Errorf("SMTP send failed: %w", err)
	}

	return nil
}

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

func (s *EmailServiceImpl) getBaseURL() string {
	return "https://lumen-app.com" // TODO: Make this configurable
}

func (s *EmailServiceImpl) generateSecureToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

func (s *EmailServiceImpl) HealthCheck(ctx context.Context) error {
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)

	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

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
