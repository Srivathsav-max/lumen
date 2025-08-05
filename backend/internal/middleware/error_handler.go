package middleware

import (
	"log/slog"
	"net/http"

	"github.com/Srivathsav-max/lumen/backend/internal/errors"
	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Details   string `json:"details,omitempty"`
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id,omitempty"`
}

func ErrorHandlingMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err
			requestID := getRequestID(c)

			if appErr, ok := errors.AsAppError(err); ok {
				if appErr.RequestID == "" {
					appErr = appErr.WithRequestID(requestID)
				}

				logError(logger, appErr, c)

				errorResponse := ErrorResponse{
					Error: ErrorDetail{
						Code:      string(appErr.Code),
						Message:   appErr.Message,
						Details:   appErr.Details,
						Timestamp: appErr.Timestamp.Format("2006-01-02T15:04:05Z"),
						RequestID: appErr.RequestID,
					},
				}

				c.JSON(appErr.StatusCode, errorResponse)
				return
			}

			logger.Error("Unexpected error occurred",
				"error", err.Error(),
				"request_id", requestID,
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"user_agent", c.Request.UserAgent(),
				"ip", c.ClientIP(),
			)

			internalErr := errors.NewInternalError("Internal server error").WithRequestID(requestID)
			errorResponse := ErrorResponse{
				Error: ErrorDetail{
					Code:      string(internalErr.Code),
					Message:   internalErr.Message,
					Timestamp: internalErr.Timestamp.Format("2006-01-02T15:04:05Z"),
					RequestID: internalErr.RequestID,
				},
			}

			c.JSON(http.StatusInternalServerError, errorResponse)
		}
	}
}

func logError(logger *slog.Logger, appErr *errors.AppError, c *gin.Context) {
	logArgs := []any{
		"error_code", appErr.Code,
		"error_message", appErr.Message,
		"request_id", appErr.RequestID,
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"user_agent", c.Request.UserAgent(),
		"ip", c.ClientIP(),
	}

	if appErr.Details != "" {
		logArgs = append(logArgs, "error_details", appErr.Details)
	}

	if appErr.Cause != nil {
		logArgs = append(logArgs, "cause", appErr.Cause.Error())
	}

	switch appErr.Code {
	case errors.ValidationError, errors.NotFoundError, errors.ConflictError:
		logger.Info("Client error occurred", logArgs...)
	case errors.AuthenticationError, errors.AuthorizationError:
		logger.Warn("Authentication/Authorization error occurred", logArgs...)
	case errors.InternalError, errors.DatabaseError, errors.ExternalServiceError:
		logger.Error("Server error occurred", logArgs...)
	default:
		logger.Error("Unknown error occurred", logArgs...)
	}
}

func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}
