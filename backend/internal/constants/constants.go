package constants

import "time"

// Application Roles
const (
	RoleAdmin     = "admin"
	RoleFree      = "free"
	RoleUser      = "user"
	RoleDeveloper = "developer"
)

// Waitlist Status
const (
	WaitlistStatusPending  = "pending"
	WaitlistStatusApproved = "approved"
	WaitlistStatusRejected = "rejected"
)

// Environment Types
const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
	EnvStaging     = "staging"
)

// HTTP Methods
const (
	HTTPMethodGET     = "GET"
	HTTPMethodPOST    = "POST"
	HTTPMethodPUT     = "PUT"
	HTTPMethodDELETE  = "DELETE"
	HTTPMethodPATCH   = "PATCH"
	HTTPMethodOPTIONS = "OPTIONS"
	HTTPMethodHEAD    = "HEAD"
	HTTPMethodTRACE   = "TRACE"
)

// Content Types
const (
	ContentTypeJSON           = "application/json"
	ContentTypeFormURLEncoded = "application/x-www-form-urlencoded"
	ContentTypeMultipartForm  = "multipart/form-data"
	ContentTypePlainText      = "text/plain"
)

// Security Constants
const (
	JWTAlgorithmHS256      = "HS256"
	JWTAlgorithmRS256      = "RS256"
	JWTAlgorithmNone       = "none"
	BearerPrefix           = "Bearer "
	CSRFTokenHeaderName    = "X-CSRF-Token"
	CSRFTokenFieldName     = "csrf_token"
	AccessTokenCookieName  = "access_token"
	RefreshTokenCookieName = "refresh_token"
	SessionIDCookieName    = "session_id"
	UserIDCookieName       = "user_id"
	UserRolesCookieName    = "user_roles"
)

// Log Levels
const (
	LogLevelDebug = "debug"
	LogLevelInfo  = "info"
	LogLevelWarn  = "warn"
	LogLevelError = "error"
)

// Log Formats
const (
	LogFormatJSON = "json"
	LogFormatText = "text"
)

// Database Configuration Defaults
const (
	DefaultDBMaxOpenConns    = 25
	DefaultDBMaxIdleConns    = 5
	DefaultDBConnMaxLifetime = 60 // minutes
	DefaultDBConnMaxIdleTime = 10 // minutes
)

// JWT Configuration Defaults
const (
	DefaultJWTAccessTokenDuration  = 15 // minutes
	DefaultJWTRefreshTokenDuration = 24 // hours
)

// Email Configuration Defaults
const (
	DefaultEmailTemplatesDir = "./services/email/templates"
)

// Time Durations
const (
	TokenValidationTolerance = 5 * time.Minute
	DatabaseTimeoutDuration  = 5 * time.Second
	EmailTokenExpiry         = 24 * time.Hour
	RateLimitCleanupInterval = 5 * time.Minute
	CSRFTokenLifetime        = 2 * time.Hour
	SessionTimeout           = 24 * time.Hour
	AccessTokenDuration      = 15 * time.Minute
	RefreshTokenDuration     = 7 * 24 * time.Hour
	RateLimitWindow          = time.Minute
)

// Rate Limiting Defaults
const (
	DefaultGlobalRPM = 500
	DefaultPerIPRPM  = 100
	DefaultAuthRPM   = 20
	DefaultAPIRPM    = 200
	DefaultBurst     = 50
)

// CORS Headers
const (
	HeaderContentType        = "Content-Type"
	HeaderAuthorization      = "Authorization"
	HeaderCSRFToken          = "X-CSRF-Token"
	HeaderRequestedWith      = "X-Requested-With"
	HeaderRequestID          = "X-Request-ID"
	HeaderBrowserFingerprint = "X-Browser-Fingerprint"
	HeaderOrigin             = "Origin"
	HeaderReferer            = "Referer"
	HeaderUserAgent          = "User-Agent"
	HeaderAccept             = "Accept"
	HeaderAcceptLanguage     = "Accept-Language"
	HeaderAcceptEncoding     = "Accept-Encoding"
)

// Security Headers
const (
	HeaderXSSProtection           = "X-XSS-Protection"
	HeaderContentTypeOptions      = "X-Content-Type-Options"
	HeaderFrameOptions            = "X-Frame-Options"
	HeaderStrictTransportSecurity = "Strict-Transport-Security"
	HeaderReferrerPolicy          = "Referrer-Policy"
	HeaderPermissionsPolicy       = "Permissions-Policy"
	HeaderContentSecurityPolicy   = "Content-Security-Policy"
)

// Security Header Values
const (
	XSSProtectionValue      = "1; mode=block"
	ContentTypeOptionsValue = "nosniff"
	FrameOptionsValue       = "DENY"
	ReferrerPolicyValue     = "strict-origin-when-cross-origin"
	PermissionsPolicyValue  = "geolocation=(), microphone=(), camera=()"
)

// Database SSL Modes
const (
	SSLModeDisable    = "disable"
	SSLModeRequire    = "require"
	SSLModeVerifyCA   = "verify-ca"
	SSLModeVerifyFull = "verify-full"
)

// Context Keys (use custom type to avoid collisions)
type ContextKey string

const (
	ContextKeyUserID      ContextKey = "user_id"
	ContextKeyUserEmail   ContextKey = "user_email"
	ContextKeyUserRoles   ContextKey = "user_roles"
	ContextKeySessionID   ContextKey = "session_id"
	ContextKeyTokenClaims ContextKey = "token_claims"
	ContextKeyRequestID   ContextKey = "request_id"
	ContextKeyIsAdmin     ContextKey = "is_admin"
)

// Error Messages
const (
	ErrMsgInvalidToken         = "Invalid or expired token"
	ErrMsgAuthRequired         = "Authentication required"
	ErrMsgInvalidCredentials   = "Invalid credentials"
	ErrMsgAccessDenied         = "Access denied"
	ErrMsgInternalServerError  = "Internal server error"
	ErrMsgValidationFailed     = "Validation failed"
	ErrMsgCSRFValidationFailed = "CSRF validation failed"
	ErrMsgCSRFDisabled         = "CSRF protection is disabled"
	ErrMsgRateLimitExceeded    = "Rate limit exceeded"
	ErrMsgMaintenanceMode      = "Service is under maintenance"
)

// Success Messages
const (
	MsgLoginSuccessful        = "Login successful"
	MsgRegistrationSuccessful = "Registration successful"
	MsgLogoutSuccessful       = "Logout successful"
	MsgPasswordChanged        = "Password changed successfully"
	MsgEmailVerified          = "Email verified successfully"
	MsgTokenRefreshed         = "Token refreshed successfully"
)

// Validation Rules
const (
	MinPasswordLength = 8
	MaxPasswordLength = 128
	MinUsernameLength = 3
	MaxUsernameLength = 50
	MaxEmailLength    = 255
	MaxNameLength     = 100
)

// Default Page Sizes
const (
	DefaultPageSize    = 20
	DefaultMaxPageSize = 100
)

// Cache Keys (if implementing caching)
const (
	CacheKeyUser          = "user:%d"
	CacheKeyUserRoles     = "user_roles:%d"
	CacheKeySystemSetting = "system_setting:%s"
)

// Development Constants
const (
	DevCSRFTokenDisabled = "development-mode-disabled"
	DevSessionPrefix     = "temp_"
	DevAnonymousPrefix   = "anonymous_"
)

// API Endpoints (for consistency)
const (
	APIVersion = "v1"
	APIPrefix  = "/api/" + APIVersion
)

// Status Codes (commonly used)
const (
	StatusOK                  = 200
	StatusCreated             = 201
	StatusNoContent           = 204
	StatusBadRequest          = 400
	StatusUnauthorized        = 401
	StatusForbidden           = 403
	StatusNotFound            = 404
	StatusConflict            = 409
	StatusTooManyRequests     = 429
	StatusInternalServerError = 500
	StatusServiceUnavailable  = 503
)
