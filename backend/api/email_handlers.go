package api

import (
	"net/http"
	"os"

	"github.com/Srivathsav-max/lumen/backend/services/email"
	"github.com/gin-gonic/gin"
)

// TestEmailRequest represents a request to send a test email
type TestEmailRequest struct {
	To      string `json:"to" binding:"required,email"`
	Subject string `json:"subject" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// TestEmailHandler handles sending a test email
func TestEmailHandler(emailService email.EmailService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse request body
		var req TestEmailRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
			return
		}

		// Create a simple test template
		testTemplate := "./services/email/templates/test_email.html"
		// Ensure the templates directory exists
		templatesDir := "./services/email/templates"
		if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
			if err := os.MkdirAll(templatesDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create templates directory: " + err.Error()})
				return
			}
		}

		// Write the test template to a file
		templatePath := templatesDir + "/test_email.html"
		err := email.WriteTemplateFile(templatePath, testTemplate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create test template: " + err.Error()})
			return
		}

		// Send the test email
		templateData := struct {
			Message string
		}{
			Message: req.Message,
		}

		err = emailService.SendEmail([]string{req.To}, req.Subject, "test_email.html", templateData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email: " + err.Error()})
			return
		}

		// Return success response
		c.JSON(http.StatusOK, gin.H{
			"message": "Test email sent successfully",
			"to":      req.To,
			"subject": req.Subject,
		})
	}
}
