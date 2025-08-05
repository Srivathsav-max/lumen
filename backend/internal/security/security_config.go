package security

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

type SecurityConfig struct {
	JWT JWTSecurityConfig `json:"jwt"`

	CSRF CSRFConfig `json:"csrf"`

	Session SessionConfig `json:"session"`

	RateLimit RateLimitConfig `json:"rate_limit"`

	CORS CORSConfig `json:"cors"`

	CSP CSPConfig `json:"csp"`

	Headers SecurityHeaders `json:"headers"`
}

type JWTSecurityConfig struct {
	Secret string `json:"secret" validate:"required,min=32"`

	AccessTokenDuration time.Duration `json:"access_token_duration" validate:"required"`

	RefreshTokenDuration time.Duration `json:"refresh_token_duration" validate:"required"`

	Algorithm string `json:"algorithm" validate:"required,oneof=HS256 HS384 HS512 RS256 RS384 RS512 ES256 ES384 ES512"`

	Issuer string `json:"issuer" validate:"required"`

	Audience []string `json:"audience" validate:"required,min=1"`

	EnableFingerprinting bool `json:"enable_fingerprinting"`

	FingerprintSalt string `json:"fingerprint_salt"`
}

type CSRFConfig struct {
	Enabled bool `json:"enabled"`

	TokenFieldName string `json:"token_field_name"`

	TokenHeaderName string `json:"token_header_name"`

	TokenLength int `json:"token_length" validate:"min=16"`

	TokenLifetime time.Duration `json:"token_lifetime"`

	SecureCookie bool `json:"secure_cookie"`

	SameSite string `json:"same_site" validate:"oneof=Strict Lax None"`

	TrustedOrigins []string `json:"trusted_origins"`
}

type SessionConfig struct {
	SessionIDLength int `json:"session_id_length" validate:"min=16"`

	Timeout time.Duration `json:"timeout"`

	SecureCookie bool `json:"secure_cookie"`

	HTTPOnly bool `json:"http_only"`

	SameSite string `json:"same_site" validate:"oneof=Strict Lax None"`

	Domain string `json:"domain"`

	Path string `json:"path"`
}

type RateLimitConfig struct {
	Enabled bool `json:"enabled"`

	GlobalRPM int `json:"global_rpm"`

	PerIPRPM int `json:"per_ip_rpm"`

	AuthRPM int `json:"auth_rpm"`

	APIRPM int `json:"api_rpm"`

	Burst int `json:"burst"`

	Window time.Duration `json:"window"`

	Distributed bool `json:"distributed"`
}

type CORSConfig struct {
	AllowedOrigins []string `json:"allowed_origins" validate:"required,min=1"`

	AllowedMethods []string `json:"allowed_methods"`

	AllowedHeaders []string `json:"allowed_headers"`

	ExposedHeaders []string `json:"exposed_headers"`

	AllowCredentials bool `json:"allow_credentials"`

	MaxAge int `json:"max_age"`

	Debug bool `json:"debug"`
}

type CSPConfig struct {
	Enabled bool `json:"enabled"`

	DefaultSrc []string `json:"default_src"`

	ScriptSrc []string `json:"script_src"`

	StyleSrc []string `json:"style_src"`

	ImgSrc []string `json:"img_src"`

	FontSrc []string `json:"font_src"`

	ConnectSrc []string `json:"connect_src"`

	MediaSrc []string `json:"media_src"`

	FrameSrc []string `json:"frame_src"`

	ReportURI string `json:"report_uri"`

	ReportOnly bool `json:"report_only"`
}

type SecurityHeaders struct {
	Enabled bool `json:"enabled"`

	HSTS HSTSConfig `json:"hsts"`

	ContentTypeOptions string `json:"content_type_options"`

	FrameOptions string `json:"frame_options"`

	XSSProtection string `json:"xss_protection"`

	ReferrerPolicy string `json:"referrer_policy"`

	PermissionsPolicy string `json:"permissions_policy"`

	RemoveServerHeader bool `json:"remove_server_header"`
}

type HSTSConfig struct {
	Enabled bool `json:"enabled"`

	MaxAge int `json:"max_age"`

	IncludeSubdomains bool `json:"include_subdomains"`

	Preload bool `json:"preload"`
}

func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		JWT: JWTSecurityConfig{
			AccessTokenDuration:  15 * time.Minute,
			RefreshTokenDuration: 7 * 24 * time.Hour,
			Algorithm:            "HS256",
			Issuer:               "lumen-auth-service",
			Audience:             []string{"lumen-api"},
			EnableFingerprinting: true,
			FingerprintSalt:      generateSecureToken(32),
		},
		CSRF: CSRFConfig{
			Enabled:         true,
			TokenFieldName:  "csrf_token",
			TokenHeaderName: "X-CSRF-Token",
			TokenLength:     32,
			TokenLifetime:   24 * time.Hour,
			SecureCookie:    true,
			SameSite:        "Strict",
			TrustedOrigins:  []string{},
		},
		Session: SessionConfig{
			SessionIDLength: 32,
			Timeout:         24 * time.Hour,
			SecureCookie:    true,
			HTTPOnly:        true,
			SameSite:        "Strict",
			Path:            "/",
		},
		RateLimit: RateLimitConfig{
			Enabled:     true,
			GlobalRPM:   1000,
			PerIPRPM:    100,
			AuthRPM:     10,
			APIRPM:      200,
			Burst:       50,
			Window:      time.Minute,
			Distributed: false,
		},
		CORS: CORSConfig{
			AllowedOrigins:   []string{},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"},
			ExposedHeaders:   []string{"X-Request-ID"},
			AllowCredentials: true,
			MaxAge:           86400,
			Debug:            false,
		},
		CSP: CSPConfig{
			Enabled:    true,
			DefaultSrc: []string{"'self'"},
			ScriptSrc:  []string{"'self'", "'unsafe-inline'"},
			StyleSrc:   []string{"'self'", "'unsafe-inline'"},
			ImgSrc:     []string{"'self'", "data:", "https:"},
			FontSrc:    []string{"'self'"},
			ConnectSrc: []string{"'self'"},
			MediaSrc:   []string{"'self'"},
			FrameSrc:   []string{"'none'"},
			ReportOnly: false,
		},
		Headers: SecurityHeaders{
			Enabled: true,
			HSTS: HSTSConfig{
				Enabled:           true,
				MaxAge:            31536000,
				IncludeSubdomains: true,
				Preload:           true,
			},
			ContentTypeOptions: "nosniff",
			FrameOptions:       "DENY",
			XSSProtection:      "1; mode=block",
			ReferrerPolicy:     "strict-origin-when-cross-origin",
			PermissionsPolicy:  "camera=(), microphone=(), geolocation=()",
			RemoveServerHeader: true,
		},
	}
}

func generateSecureToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		panic("Failed to generate secure token: " + err.Error())
	}
	return hex.EncodeToString(bytes)
}

func (c *SecurityConfig) Validate() error {
	return nil
}
