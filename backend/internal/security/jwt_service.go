package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/golang-jwt/jwt/v4"
)

type JWTService struct {
	config *JWTSecurityConfig
	logger *slog.Logger
}

type SecureJWTClaims struct {
	jwt.RegisteredClaims

	UserID int64    `json:"user_id"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`

	TokenID     string `json:"jti"`
	TokenType   string `json:"token_type"`
	Fingerprint string `json:"fingerprint"`
	IPAddress   string `json:"ip_address"`
	UserAgent   string `json:"user_agent"`

	SessionID string `json:"session_id"`
	DeviceID  string `json:"device_id"`
	LoginTime int64  `json:"login_time"`

	Permissions []string `json:"permissions"`
	Scopes      []string `json:"scopes"`
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int64     `json:"expires_in"`
	ExpiresAt    time.Time `json:"expires_at"`
	IssuedAt     time.Time `json:"issued_at"`
	Fingerprint  string    `json:"fingerprint"`
	CSRFToken    string    `json:"csrf_token"`
}

func NewJWTService(config *JWTSecurityConfig, logger *slog.Logger) *JWTService {
	return &JWTService{
		config: config,
		logger: logger,
	}
}

func (s *JWTService) GenerateTokenPair(userID int64, email string, roles []string, r *http.Request) (*TokenPair, error) {
	now := time.Now().UTC()

	tokenID, err := s.generateSecureID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token ID: %w", err)
	}

	sessionID, err := s.generateSecureID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate session ID: %w", err)
	}

	fingerprint := s.generateFingerprint(r)

	deviceID := s.generateDeviceID(r)

	accessClaims := &SecureJWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenDuration)),
		},
		UserID:      userID,
		Email:       email,
		Roles:       roles,
		TokenID:     tokenID,
		TokenType:   "access",
		Fingerprint: fingerprint,
		IPAddress:   s.getClientIP(r),
		UserAgent:   s.hashUserAgent(r.UserAgent()),
		SessionID:   sessionID,
		DeviceID:    deviceID,
		LoginTime:   now.Unix(),
		Permissions: s.getRolePermissions(roles),
		Scopes:      s.getDefaultScopes(),
	}

	accessToken, err := s.signToken(accessClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	refreshTokenID, err := s.generateSecureID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token ID: %w", err)
	}

	refreshClaims := &SecureJWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        refreshTokenID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.RefreshTokenDuration)),
		},
		UserID:      userID,
		Email:       email,
		TokenID:     refreshTokenID,
		TokenType:   "refresh",
		Fingerprint: fingerprint,
		SessionID:   sessionID,
		DeviceID:    deviceID,
		LoginTime:   now.Unix(),
	}

	refreshToken, err := s.signToken(refreshClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	csrfToken, err := s.generateCSRFToken(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate CSRF token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.config.AccessTokenDuration.Seconds()),
		ExpiresAt:    now.Add(s.config.AccessTokenDuration),
		IssuedAt:     now,
		Fingerprint:  fingerprint,
		CSRFToken:    csrfToken,
	}, nil
}

func (s *JWTService) ValidateToken(tokenString string, r *http.Request) (*SecureJWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SecureJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != s.config.Algorithm {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		if token.Method.Alg() == constants.JWTAlgorithmNone {
			return nil, fmt.Errorf("algorithm none not allowed")
		}

		return []byte(s.config.Secret), nil
	})

	if err != nil {
		s.logger.Warn("Token parsing failed", "error", err)
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*SecureJWTClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	if err := s.validateStandardClaims(claims); err != nil {
		return nil, fmt.Errorf("standard claims validation failed: %w", err)
	}

	if err := s.validateSecurityClaims(claims, r); err != nil {
		return nil, fmt.Errorf("security claims validation failed: %w", err)
	}

	s.logger.Debug("Token validated successfully",
		"user_id", claims.UserID,
		"token_id", claims.TokenID,
		"token_type", claims.TokenType,
	)

	return claims, nil
}

func (s *JWTService) signToken(claims *SecureJWTClaims) (string, error) {
	var signingMethod jwt.SigningMethod

	switch s.config.Algorithm {
	case constants.JWTAlgorithmHS256:
		signingMethod = jwt.SigningMethodHS256
	case "HS384":
		signingMethod = jwt.SigningMethodHS384
	case "HS512":
		signingMethod = jwt.SigningMethodHS512
	default:
		return "", fmt.Errorf("unsupported signing algorithm: %s", s.config.Algorithm)
	}

	token := jwt.NewWithClaims(signingMethod, claims)

	token.Header["kid"] = "main"
	token.Header["typ"] = "JWT"

	return token.SignedString([]byte(s.config.Secret))
}

func (s *JWTService) validateStandardClaims(claims *SecureJWTClaims) error {
	now := time.Now().UTC()

	if claims.Issuer != s.config.Issuer {
		return fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	if !s.validateAudience(claims.Audience, s.config.Audience) {
		return fmt.Errorf("invalid audience: %v", claims.Audience)
	}

	if claims.ExpiresAt == nil || claims.ExpiresAt.Time.Before(now) {
		return fmt.Errorf("token expired")
	}

	if claims.NotBefore != nil && claims.NotBefore.Time.After(now) {
		return fmt.Errorf("token not valid yet")
	}

	if claims.IssuedAt != nil && claims.IssuedAt.Time.After(now.Add(constants.TokenValidationTolerance)) {
		return fmt.Errorf("token issued in the future")
	}

	return nil
}

func (s *JWTService) validateSecurityClaims(claims *SecureJWTClaims, r *http.Request) error {
	if !s.config.EnableFingerprinting {
		return nil
	}

	currentFingerprint := s.generateFingerprint(r)
	if claims.Fingerprint != currentFingerprint {
		s.logger.Warn("Fingerprint mismatch detected",
			"expected", claims.Fingerprint,
			"actual", currentFingerprint,
			"user_id", claims.UserID,
		)
		return fmt.Errorf("fingerprint validation failed")
	}

	if claims.IPAddress != "" {
		currentIP := s.getClientIP(r)
		if claims.IPAddress != currentIP {
			s.logger.Warn("IP address change detected",
				"expected", claims.IPAddress,
				"actual", currentIP,
				"user_id", claims.UserID,
			)
		}
	}

	return nil
}

func (s *JWTService) generateFingerprint(r *http.Request) string {
	if !s.config.EnableFingerprinting {
		return ""
	}

	userAgent := r.UserAgent()
	acceptHeader := r.Header.Get("Accept")
	acceptLanguage := r.Header.Get("Accept-Language")
	acceptEncoding := r.Header.Get("Accept-Encoding")

	fingerprintData := fmt.Sprintf("%s|%s|%s|%s",
		userAgent, acceptHeader, acceptLanguage, acceptEncoding)

	return s.hashWithSalt(fingerprintData, s.config.FingerprintSalt)
}

func (s *JWTService) generateDeviceID(r *http.Request) string {
	userAgent := r.UserAgent()
	return s.hashWithSalt(userAgent, "device_salt")
}

func (s *JWTService) generateCSRFToken(sessionID string) (string, error) {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	data := fmt.Sprintf("%s|%s", sessionID, hex.EncodeToString(randomBytes))
	return s.hashWithSalt(data, "csrf_salt"), nil
}

func (s *JWTService) generateSecureID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *JWTService) hashWithSalt(data, salt string) string {
	h := hmac.New(sha256.New, []byte(salt))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

func (s *JWTService) hashUserAgent(userAgent string) string {
	return s.hashWithSalt(userAgent, "ua_salt")
}

func (s *JWTService) getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}

	return ip
}

func (s *JWTService) validateAudience(tokenAudience []string, configAudience []string) bool {
	if len(tokenAudience) == 0 {
		return false
	}

	for _, tokenAud := range tokenAudience {
		for _, configAud := range configAudience {
			if tokenAud == configAud {
				return true
			}
		}
	}

	return false
}

func (s *JWTService) getRolePermissions(roles []string) []string {
	permissionMap := map[string][]string{
		"admin": {"read:all", "write:all", "delete:all", "admin:all"},
		"user":  {"read:own", "write:own"},
		"guest": {"read:public"},
	}

	var permissions []string
	for _, role := range roles {
		if perms, exists := permissionMap[role]; exists {
			permissions = append(permissions, perms...)
		}
	}

	return permissions
}

func (s *JWTService) getDefaultScopes() []string {
	return []string{"api:read", "api:write"}
}
