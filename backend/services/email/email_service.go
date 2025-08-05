package email

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"path/filepath"
)

type EmailConfig struct {
	Host         string
	Port         string
	Username     string
	Password     string
	FromEmail    string
	FromName     string
	TemplatesDir string
}

type EmailService interface {
	SendEmail(to []string, subject, templateName string, data interface{}) error
	SendVerificationEmail(to string, verificationLink string) error
	SendPasswordResetEmail(to string, resetLink string) error
}

type EmailServiceImpl struct {
	config EmailConfig
}

func NewEmailService(config EmailConfig) EmailService {
	return &EmailServiceImpl{
		config: config,
	}
}

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

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func (s *EmailServiceImpl) SendEmail(to []string, subject, templateName string, data interface{}) error {
	body, err := s.parseTemplate(templateName, data)
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	subject = "Subject: " + subject + "\n"
	msg := []byte(subject + "From: " + from + "\n" + mime + "\n" + body)

	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)
	err = smtp.SendMail(addr, auth, s.config.FromEmail, to, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

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

func WriteTemplateFile(filePath, templateContent string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	return os.WriteFile(filePath, []byte(templateContent), 0644)
}

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
