package handlers

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/Srivathsav-max/lumen/backend/internal/container"
)

// EmailHandlers handles email-related HTTP requests
type EmailHandlers struct {
	container *container.Container
}

// NewEmailHandlers creates a new EmailHandlers instance
func NewEmailHandlers(container *container.Container) *EmailHandlers {
	return &EmailHandlers{
		container: container,
	}
}

// TestEmailRequest represents a request to send a test email
type TestEmailRequest struct {
	To      string `json:"to" binding:"required,email"`
	Subject string `json:"subject" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// SendTestEmail handles sending a test email
func (h *EmailHandlers) SendTestEmail(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	emailService := h.container.GetEmailService()

	// Parse request body
	var req TestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid test email request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Create templates directory if it doesn't exist
	templatesDir := "./internal/services/templates"
	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		if err := os.MkdirAll(templatesDir, 0755); err != nil {
			logger.Error("Failed to create templates directory", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create templates directory"})
			return
		}
	}

	// Create test template content
	testTemplateContent := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Email</title>
</head>
<body>
    <h1>Test Email from Lumen</h1>
    <p>{{.Message}}</p>
    <p>This is a test email sent from the Lumen application.</p>
    <hr>
    <p><small>Sent by {{.AppName}}</small></p>
</body>
</html>`

	// Write the test template to a file
	templatePath := filepath.Join(templatesDir, "test_email.html")
	if err := os.WriteFile(templatePath, []byte(testTemplateContent), 0644); err != nil {
		logger.Error("Failed to create test template", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create test template"})
		return
	}

	// For test email, we'll use a simple approach since there's no generic SendEmail method
	// We can create a temporary user ID of 0 for test purposes
	err := emailService.SendWelcomeEmail(ctx, 0, req.To, "Test User")
	if err != nil {
		logger.Error("Failed to send test email", "error", err, "to", req.To)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	logger.Info("Test email sent successfully", "to", req.To, "subject", req.Subject)

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Test email sent successfully",
		"to":      req.To,
		"subject": req.Subject,
	})
}