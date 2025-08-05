package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
)

type CSRFService struct {
	config *CSRFConfig
	logger *slog.Logger
}

type CSRFToken struct {
	Token     string    `json:"token"`
	SessionID string    `json:"session_id"`
	IssuedAt  time.Time `json:"issued_at"`
	ExpiresAt time.Time `json:"expires_at"`
	UserID    int64     `json:"user_id,omitempty"`
	IPAddress string    `json:"ip_address,omitempty"`
}

type CSRFValidationResult struct {
	Valid     bool       `json:"valid"`
	Reason    string     `json:"reason,omitempty"`
	TokenInfo *CSRFToken `json:"token_info,omitempty"`
}

func NewCSRFService(config *CSRFConfig, logger *slog.Logger) *CSRFService {
	return &CSRFService{
		config: config,
		logger: logger,
	}
}

func (s *CSRFService) GenerateToken(sessionID string, userID int64, r *http.Request) (*CSRFToken, error) {
	if !s.config.Enabled {
		return nil, fmt.Errorf("CSRF protection is disabled")
	}

	now := time.Now().UTC()

	tokenBytes := make([]byte, s.config.TokenLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate random token: %w", err)
	}

	csrfToken := &CSRFToken{
		Token:     hex.EncodeToString(tokenBytes),
		SessionID: sessionID,
		IssuedAt:  now,
		ExpiresAt: now.Add(s.config.TokenLifetime),
		UserID:    userID,
		IPAddress: s.getClientIP(r),
	}

	signedToken, err := s.signToken(csrfToken)
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	csrfToken.Token = signedToken

	s.logger.Debug("CSRF token generated",
		"session_id", sessionID,
		"user_id", userID,
		"expires_at", csrfToken.ExpiresAt,
	)

	return csrfToken, nil
}

func (s *CSRFService) ValidateToken(token string, sessionID string, r *http.Request) *CSRFValidationResult {
	if !s.config.Enabled {
		return &CSRFValidationResult{Valid: true, Reason: "CSRF protection disabled"}
	}

	requestToken := s.extractTokenFromRequest(r, token)
	if requestToken == "" {
		return &CSRFValidationResult{
			Valid:  false,
			Reason: "CSRF token not found in request",
		}
	}

	tokenInfo, err := s.verifyAndDecodeToken(requestToken)
	if err != nil {
		s.logger.Warn("CSRF token signature verification failed", "error", err)
		return &CSRFValidationResult{
			Valid:  false,
			Reason: fmt.Sprintf("Token verification failed: %v", err),
		}
	}

	if time.Now().UTC().After(tokenInfo.ExpiresAt) {
		s.logger.Warn("CSRF token expired",
			"expired_at", tokenInfo.ExpiresAt,
			"session_id", sessionID,
		)
		return &CSRFValidationResult{
			Valid:     false,
			Reason:    "Token expired",
			TokenInfo: tokenInfo,
		}
	}

	if tokenInfo.SessionID != sessionID {
		s.logger.Warn("CSRF token session ID mismatch",
			"expected", sessionID,
			"actual", tokenInfo.SessionID,
		)
		return &CSRFValidationResult{
			Valid:     false,
			Reason:    "Session ID mismatch",
			TokenInfo: tokenInfo,
		}
	}

	if !s.validateOrigin(r) {
		s.logger.Warn("CSRF origin validation failed",
			"origin", r.Header.Get("Origin"),
			"referer", r.Header.Get("Referer"),
		)
		return &CSRFValidationResult{
			Valid:     false,
			Reason:    "Origin validation failed",
			TokenInfo: tokenInfo,
		}
	}

	if !s.validateCustomHeaders(r) {
		s.logger.Warn("CSRF custom header validation failed")
		return &CSRFValidationResult{
			Valid:     false,
			Reason:    "Custom header validation failed",
			TokenInfo: tokenInfo,
		}
	}

	if tokenInfo.IPAddress != "" && tokenInfo.IPAddress != s.getClientIP(r) {
		s.logger.Warn("CSRF token IP address changed",
			"original", tokenInfo.IPAddress,
			"current", s.getClientIP(r),
		)
	}

	s.logger.Debug("CSRF token validated successfully",
		"session_id", sessionID,
		"token_age", time.Since(tokenInfo.IssuedAt),
	)

	return &CSRFValidationResult{
		Valid:     true,
		TokenInfo: tokenInfo,
	}
}

func (s *CSRFService) SetCSRFCookie(w http.ResponseWriter, token *CSRFToken) {
	cookie := &http.Cookie{
		Name:     s.config.TokenFieldName,
		Value:    token.Token,
		Path:     "/",
		Domain:   "",
		Expires:  token.ExpiresAt,
		Secure:   s.config.SecureCookie,
		HttpOnly: false,
		SameSite: s.getSameSiteCookie(),
	}

	http.SetCookie(w, cookie)
}

func (s *CSRFService) ClearCSRFCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     s.config.TokenFieldName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   s.config.SecureCookie,
		HttpOnly: false,
		SameSite: s.getSameSiteCookie(),
	}

	http.SetCookie(w, cookie)
}

func (s *CSRFService) signToken(token *CSRFToken) (string, error) {
	payload := fmt.Sprintf("%s|%s|%d|%d",
		token.Token,
		token.SessionID,
		token.IssuedAt.Unix(),
		token.ExpiresAt.Unix(),
	)

	h := hmac.New(sha256.New, []byte("csrf_signing_key"))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	signedToken := base64.URLEncoding.EncodeToString([]byte(payload + "|" + signature))

	return signedToken, nil
}

func (s *CSRFService) verifyAndDecodeToken(signedToken string) (*CSRFToken, error) {
	decoded, err := base64.URLEncoding.DecodeString(signedToken)
	if err != nil {
		return nil, fmt.Errorf("invalid token encoding: %w", err)
	}

	parts := strings.Split(string(decoded), "|")
	if len(parts) != 5 {
		return nil, fmt.Errorf("invalid token format")
	}

	payload := strings.Join(parts[:4], "|")
	providedSignature := parts[4]

	h := hmac.New(sha256.New, []byte("csrf_signing_key"))
	h.Write([]byte(payload))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if subtle.ConstantTimeCompare([]byte(providedSignature), []byte(expectedSignature)) != 1 {
		return nil, fmt.Errorf("invalid token signature")
	}

	token := &CSRFToken{
		Token:     parts[0],
		SessionID: parts[1],
	}

	if issuedAt, err := parseUnixTime(parts[2]); err == nil {
		token.IssuedAt = issuedAt
	}

	if expiresAt, err := parseUnixTime(parts[3]); err == nil {
		token.ExpiresAt = expiresAt
	}

	return token, nil
}

func (s *CSRFService) extractTokenFromRequest(r *http.Request, fallbackToken string) string {
	if token := r.Header.Get(s.config.TokenHeaderName); token != "" {
		return token
	}

	if token := r.FormValue(s.config.TokenFieldName); token != "" {
		return token
	}

	if cookie, err := r.Cookie(s.config.TokenFieldName); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	if token := r.URL.Query().Get(s.config.TokenFieldName); token != "" {
		return token
	}

	return fallbackToken
}

func (s *CSRFService) validateOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	referer := r.Header.Get("Referer")

	s.logger.Debug("Validating origin",
		"origin", origin,
		"referer", referer,
		"trusted_origins", s.config.TrustedOrigins,
	)

	if r.Method == constants.HTTPMethodOPTIONS && origin == "" {
		s.logger.Warn("OPTIONS request without origin header")
		return false
	}

	if origin != "" {
		trusted := s.isOriginTrusted(origin)
		s.logger.Debug("Origin validation result", "origin", origin, "trusted", trusted)
		return trusted
	}

	if referer != "" {
		trusted := s.isRefererTrusted(referer)
		s.logger.Debug("Referer validation result", "referer", referer, "trusted", trusted)
		return trusted
	}

	allowNoOrigin := len(s.config.TrustedOrigins) == 0
	s.logger.Debug("No origin/referer found", "allow_no_origin", allowNoOrigin)
	return allowNoOrigin
}

func (s *CSRFService) validateCustomHeaders(r *http.Request) bool {
	customHeaders := []string{
		constants.HeaderRequestedWith,
		constants.HeaderCSRFToken,
		"X-Custom-Header",
	}

	for _, header := range customHeaders {
		if r.Header.Get(header) != "" {
			return true
		}
	}

	if r.Method == constants.HTTPMethodGET ||
		(r.Method == constants.HTTPMethodPOST && s.isSimpleContentType(r.Header.Get(constants.HeaderContentType))) {
		return true
	}

	return false
}

func (s *CSRFService) isOriginTrusted(origin string) bool {
	if len(s.config.TrustedOrigins) == 0 {
		if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
			s.logger.Debug("Allowing localhost origin in development", "origin", origin)
			return true
		}
		return false
	}

	for _, trustedOrigin := range s.config.TrustedOrigins {
		if origin == trustedOrigin {
			return true
		}
	}

	return false
}

func (s *CSRFService) isRefererTrusted(referer string) bool {
	refererURL, err := url.Parse(referer)
	if err != nil {
		return false
	}

	refererOrigin := fmt.Sprintf("%s://%s", refererURL.Scheme, refererURL.Host)
	return s.isOriginTrusted(refererOrigin)
}

func (s *CSRFService) isSimpleContentType(contentType string) bool {
	simpleTypes := []string{
		constants.ContentTypeFormURLEncoded,
		constants.ContentTypeMultipartForm,
		constants.ContentTypePlainText,
	}

	if semicolon := strings.Index(contentType, ";"); semicolon != -1 {
		contentType = contentType[:semicolon]
	}
	contentType = strings.TrimSpace(strings.ToLower(contentType))

	for _, simpleType := range simpleTypes {
		if contentType == simpleType {
			return true
		}
	}

	return false
}

func (s *CSRFService) getSameSiteCookie() http.SameSite {
	switch strings.ToLower(s.config.SameSite) {
	case "strict":
		return http.SameSiteStrictMode
	case "lax":
		return http.SameSiteLaxMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func (s *CSRFService) getClientIP(r *http.Request) string {
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

func parseUnixTime(timestamp string) (time.Time, error) {
	var unix int64
	if _, err := fmt.Sscanf(timestamp, "%d", &unix); err != nil {
		return time.Time{}, err
	}

	return time.Unix(unix, 0).UTC(), nil
}
