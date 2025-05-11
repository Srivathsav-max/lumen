package email

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"path/filepath"
)

// EmailConfig holds the configuration for the email service
type EmailConfig struct {
	Host         string
	Port         string
	Username     string
	Password     string
	FromEmail    string
	FromName     string
	TemplatesDir string
}

// EmailService defines the interface for sending emails
type EmailService interface {
	SendEmail(to []string, subject, templateName string, data interface{}) error
	SendVerificationEmail(to string, verificationLink string) error
	SendPasswordResetEmail(to string, resetLink string) error
}

// EmailServiceImpl implements the EmailService interface
type EmailServiceImpl struct {
	config EmailConfig
}

// NewEmailService creates a new email service
func NewEmailService(config EmailConfig) EmailService {
	return &EmailServiceImpl{
		config: config,
	}
}

// LoadEmailConfigFromEnv loads email configuration from environment variables
func LoadEmailConfigFromEnv() EmailConfig {
	return EmailConfig{
		Host:         getEnv("EMAIL_HOST", "smtp.gmail.com"),
		Port:         getEnv("EMAIL_PORT", "587"),
		Username:     getEnv("EMAIL_USERNAME", ""),
		Password:     getEnv("EMAIL_PASSWORD", ""),
		FromEmail:    getEnv("EMAIL_FROM", ""),
		FromName:     getEnv("EMAIL_FROM_NAME", "Lumen App"),
		TemplatesDir: getEnv("EMAIL_TEMPLATES_DIR", "./services/email/templates"),
	}
}

// Helper function to get environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// SendEmail sends an email using the specified template
func (s *EmailServiceImpl) SendEmail(to []string, subject, templateName string, data interface{}) error {
	// Prepare email content
	body, err := s.parseTemplate(templateName, data)
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	// Set up authentication information
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	// Compose the email
	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	subject = "Subject: " + subject + "\n"
	msg := []byte(subject + "From: " + from + "\n" + mime + "\n" + body)

	// Send the email
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)
	err = smtp.SendMail(addr, auth, s.config.FromEmail, to, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendVerificationEmail sends an email verification link
func (s *EmailServiceImpl) SendVerificationEmail(to string, verificationLink string) error {
	subject := "Verify Your Email Address"
	templateData := struct {
		VerificationLink string
		AppName          string
	}{
		VerificationLink: verificationLink,
		AppName:          "Lumen",
	}
	return s.SendEmail([]string{to}, subject, "verification.html", templateData)
}

// SendPasswordResetEmail sends a password reset link
func (s *EmailServiceImpl) SendPasswordResetEmail(to string, resetLink string) error {
	subject := "Reset Your Password"
	templateData := struct {
		ResetLink string
		AppName   string
	}{
		ResetLink: resetLink,
		AppName:   "Lumen",
	}
	return s.SendEmail([]string{to}, subject, "password_reset.html", templateData)
}

// WriteTemplateFile writes a template string to a file
func WriteTemplateFile(filePath, templateContent string) error {
	// Create directory if it doesn't exist
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Write template to file
	return os.WriteFile(filePath, []byte(templateContent), 0644)
}

// parseTemplate parses the specified template file with the given data
func (s *EmailServiceImpl) parseTemplate(templateName string, data interface{}) (string, error) {
	templatePath := filepath.Join(s.config.TemplatesDir, templateName)
	t, err := template.ParseFiles(templatePath)
	if err != nil {
		return "", fmt.Errorf("failed to parse template file: %w", err)
	}

	buf := new(bytes.Buffer)
	if err = t.Execute(buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return buf.String(), nil
}
