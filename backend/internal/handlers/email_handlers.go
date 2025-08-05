package handlers

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/gin-gonic/gin"
)

type EmailHandlers struct {
	container *container.Container
}

func NewEmailHandlers(container *container.Container) *EmailHandlers {
	return &EmailHandlers{
		container: container,
	}
}

type TestEmailRequest struct {
	To      string `json:"to" binding:"required,email"`
	Subject string `json:"subject" binding:"required"`
	Message string `json:"message" binding:"required"`
}

func (h *EmailHandlers) SendTestEmail(c *gin.Context) {
	ctx := context.Background()
	logger := h.container.GetLogger()
	emailService := h.container.GetEmailService()

	var req TestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid test email request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	templatesDir := "./internal/services/templates"
	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		if err := os.MkdirAll(templatesDir, 0755); err != nil {
			logger.Error("Failed to create templates directory", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create templates directory"})
			return
		}
	}

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

	templatePath := filepath.Join(templatesDir, "test_email.html")
	if err := os.WriteFile(templatePath, []byte(testTemplateContent), 0644); err != nil {
		logger.Error("Failed to create test template", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create test template"})
		return
	}

	err := emailService.SendWelcomeEmail(ctx, 0, req.To, "Test User")
	if err != nil {
		logger.Error("Failed to send test email", "error", err, "to", req.To)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	logger.Info("Test email sent successfully", "to", req.To, "subject", req.Subject)

	c.JSON(http.StatusOK, gin.H{
		"message": "Test email sent successfully",
		"to":      req.To,
		"subject": req.Subject,
	})
}
