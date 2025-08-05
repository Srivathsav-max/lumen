# Security Package

## Overview

The `security` package provides comprehensive security services for the Lumen backend application. It implements authentication, authorization, token management, encryption, and various security utilities to protect the application from common security threats and ensure secure communication.

## Purpose

- **Authentication**: JWT token generation, validation, and management
- **Authorization**: Role-based access control (RBAC) and permission management
- **Encryption**: Data encryption, password hashing, and cryptographic operations
- **Security Headers**: HTTP security headers and CORS management
- **Rate Limiting**: Request rate limiting and abuse prevention
- **Input Validation**: Security-focused input validation and sanitization
- **Audit Logging**: Security event logging and monitoring
- **CSRF Protection**: Cross-Site Request Forgery prevention
- **XSS Protection**: Cross-Site Scripting prevention

## Dependencies

### External Dependencies
```go
// JWT and cryptography
"github.com/golang-jwt/jwt/v5"       // JWT token handling
"golang.org/x/crypto/bcrypt"         // Password hashing
"golang.org/x/crypto/argon2"         // Advanced password hashing
"crypto/rand"                        // Cryptographic random generation
"crypto/aes"                         // AES encryption
"crypto/cipher"                      // Cipher operations
"crypto/sha256"                      // SHA-256 hashing
"crypto/subtle"                      // Constant-time comparisons
"crypto/rsa"                         // RSA encryption
"crypto/x509"                        // X.509 certificate handling
"encoding/pem"                       // PEM encoding

// Security utilities
"github.com/google/uuid"             // UUID generation
"github.com/gorilla/securecookie"    // Secure cookie handling
"github.com/gorilla/csrf"            // CSRF protection
"github.com/unrolled/secure"         // Security middleware

// Rate limiting
"golang.org/x/time/rate"             // Rate limiter
"github.com/go-redis/redis/v8"       // Redis for distributed rate limiting

// Validation and sanitization
"github.com/go-playground/validator/v10" // Input validation
"github.com/microcosm-cc/bluemonday"     // HTML sanitization
"html"                               // HTML escaping
"net/url"                            // URL validation
"regexp"                             // Regular expressions

// Time and context
"time"                               // Time operations
"context"                            // Context handling
"fmt"                                // String formatting
"strings"                            // String manipulation
"encoding/base64"                    // Base64 encoding
"encoding/hex"                       // Hex encoding
"encoding/json"                      // JSON operations
```

### Internal Dependencies
```go
"github.com/Srivathsav-max/lumen/backend/internal/logger"     // Logging services
"github.com/Srivathsav-max/lumen/backend/internal/errors"     // Error handling
"github.com/Srivathsav-max/lumen/backend/internal/config"     // Configuration
"github.com/Srivathsav-max/lumen/backend/internal/repository" // Data access
```

## Security Architecture

### Core Security Services

```go
// SecurityManager coordinates all security services
type SecurityManager interface {
    // Authentication services
    GetJWTService() JWTService
    GetPasswordService() PasswordService
    GetTokenService() TokenService
    
    // Authorization services
    GetAuthorizationService() AuthorizationService
    GetRoleService() RoleService
    GetPermissionService() PermissionService
    
    // Protection services
    GetRateLimitService() RateLimitService
    GetCSRFService() CSRFService
    GetXSSService() XSSService
    
    // Encryption services
    GetEncryptionService() EncryptionService
    GetHashingService() HashingService
    
    // Validation services
    GetValidationService() ValidationService
    GetSanitizationService() SanitizationService
    
    // Audit services
    GetAuditService() AuditService
    
    // Health and metrics
    HealthCheck(ctx context.Context) error
    GetSecurityMetrics(ctx context.Context) (*SecurityMetrics, error)
}

type SecurityMetrics struct {
    AuthenticationAttempts int64 `json:"authentication_attempts"`
    FailedLogins          int64 `json:"failed_logins"`
    TokensIssued          int64 `json:"tokens_issued"`
    TokensRevoked         int64 `json:"tokens_revoked"`
    RateLimitViolations   int64 `json:"rate_limit_violations"`
    CSRFAttempts          int64 `json:"csrf_attempts"`
    XSSAttempts           int64 `json:"xss_attempts"`
    SecurityEvents        int64 `json:"security_events"`
}

// securityManager implements SecurityManager
type securityManager struct {
    jwtService          JWTService
    passwordService     PasswordService
    tokenService        TokenService
    authzService        AuthorizationService
    roleService         RoleService
    permissionService   PermissionService
    rateLimitService    RateLimitService
    csrfService         CSRFService
    xssService          XSSService
    encryptionService   EncryptionService
    hashingService      HashingService
    validationService   ValidationService
    sanitizationService SanitizationService
    auditService        AuditService
    logger              logger.Logger
    config              *SecurityConfig
    metrics             *SecurityMetrics
    mu                  sync.RWMutex
}

type SecurityConfig struct {
    // JWT configuration
    JWTSecret           string        `json:"jwt_secret"`
    JWTExpiry           time.Duration `json:"jwt_expiry"`
    RefreshTokenExpiry  time.Duration `json:"refresh_token_expiry"`
    
    // Password configuration
    PasswordMinLength   int  `json:"password_min_length"`
    PasswordRequireUpper bool `json:"password_require_upper"`
    PasswordRequireLower bool `json:"password_require_lower"`
    PasswordRequireDigit bool `json:"password_require_digit"`
    PasswordRequireSymbol bool `json:"password_require_symbol"`
    
    // Rate limiting
    RateLimitEnabled    bool          `json:"rate_limit_enabled"`
    RateLimitRPS        int           `json:"rate_limit_rps"`
    RateLimitBurst      int           `json:"rate_limit_burst"`
    RateLimitWindow     time.Duration `json:"rate_limit_window"`
    
    // CSRF protection
    CSRFEnabled         bool   `json:"csrf_enabled"`
    CSRFSecret          string `json:"csrf_secret"`
    CSRFTokenLength     int    `json:"csrf_token_length"`
    
    // XSS protection
    XSSEnabled          bool `json:"xss_enabled"`
    XSSStrictMode       bool `json:"xss_strict_mode"`
    
    // Encryption
    EncryptionKey       string `json:"encryption_key"`
    EncryptionAlgorithm string `json:"encryption_algorithm"`
    
    // Security headers
    SecurityHeadersEnabled bool `json:"security_headers_enabled"`
    HSTSEnabled           bool `json:"hsts_enabled"`
    HSTSMaxAge            int  `json:"hsts_max_age"`
    
    // Audit logging
    AuditEnabled        bool `json:"audit_enabled"`
    AuditLogLevel       string `json:"audit_log_level"`
}

// NewSecurityManager creates a new security manager
func NewSecurityManager(
    logger logger.Logger,
    config *SecurityConfig,
    tokenRepo repository.TokenRepository,
    userRepo repository.UserRepository,
    roleRepo repository.RoleRepository,
    auditRepo repository.AuditRepository,
) SecurityManager {
    sm := &securityManager{
        logger:  logger,
        config:  config,
        metrics: &SecurityMetrics{},
    }
    
    // Initialize services
    sm.jwtService = NewJWTService(logger, config, tokenRepo)
    sm.passwordService = NewPasswordService(logger, config)
    sm.tokenService = NewTokenService(logger, config, tokenRepo)
    sm.authzService = NewAuthorizationService(logger, config, roleRepo, userRepo)
    sm.roleService = NewRoleService(logger, config, roleRepo)
    sm.permissionService = NewPermissionService(logger, config, roleRepo)
    sm.rateLimitService = NewRateLimitService(logger, config)
    sm.csrfService = NewCSRFService(logger, config)
    sm.xssService = NewXSSService(logger, config)
    sm.encryptionService = NewEncryptionService(logger, config)
    sm.hashingService = NewHashingService(logger, config)
    sm.validationService = NewValidationService(logger, config)
    sm.sanitizationService = NewSanitizationService(logger, config)
    sm.auditService = NewAuditService(logger, config, auditRepo)
    
    return sm
}
```

## JWT Service

### JWT Token Management

```go
// JWTService handles JWT token operations
type JWTService interface {
    // Token generation
    GenerateToken(claims *SecureJWTClaims) (string, error)
    GenerateTokenPair(claims *SecureJWTClaims) (*TokenPair, error)
    
    // Token validation
    ValidateToken(tokenString string) (*SecureJWTClaims, error)
    ValidateRefreshToken(tokenString string) (*SecureJWTClaims, error)
    
    // Token refresh
    RefreshToken(refreshToken string) (*TokenPair, error)
    
    // Token revocation
    RevokeToken(tokenID string) error
    RevokeAllUserTokens(userID string) error
    
    // Token introspection
    IntrospectToken(tokenString string) (*TokenIntrospection, error)
    
    // Key management
    RotateSigningKey() error
    GetPublicKey() (*rsa.PublicKey, error)
}

// SecureJWTClaims contains all JWT claims
type SecureJWTClaims struct {
    UserClaims     UserClaims     `json:"user"`
    SecurityClaims SecurityClaims `json:"security"`
    SessionClaims  SessionClaims  `json:"session"`
    jwt.RegisteredClaims
}

type UserClaims struct {
    UserID    string `json:"user_id"`
    Email     string `json:"email"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
}

type SecurityClaims struct {
    Role        string   `json:"role"`
    Permissions []string `json:"permissions"`
    Scopes      []string `json:"scopes"`
}

type SessionClaims struct {
    SessionID string    `json:"session_id"`
    IssuedAt  time.Time `json:"issued_at"`
    ExpiresAt time.Time `json:"expires_at"`
    IPAddress string    `json:"ip_address"`
    UserAgent string    `json:"user_agent"`
}

type TokenPair struct {
    AccessToken  string    `json:"access_token"`
    RefreshToken string    `json:"refresh_token"`
    TokenType    string    `json:"token_type"`
    ExpiresIn    int64     `json:"expires_in"`
    ExpiresAt    time.Time `json:"expires_at"`
    Scope        string    `json:"scope"`
}

type TokenIntrospection struct {
    Active    bool      `json:"active"`
    TokenType string    `json:"token_type"`
    Scope     string    `json:"scope"`
    ClientID  string    `json:"client_id"`
    UserID    string    `json:"user_id"`
    ExpiresAt time.Time `json:"expires_at"`
    IssuedAt  time.Time `json:"issued_at"`
}

// jwtService implements JWTService
type jwtService struct {
    logger       logger.Logger
    config       *SecurityConfig
    tokenRepo    repository.TokenRepository
    signingKey   *rsa.PrivateKey
    publicKey    *rsa.PublicKey
    keyID        string
    blacklist    map[string]time.Time // In-memory blacklist for revoked tokens
    blacklistMu  sync.RWMutex
}

// NewJWTService creates a new JWT service
func NewJWTService(
    logger logger.Logger,
    config *SecurityConfig,
    tokenRepo repository.TokenRepository,
) JWTService {
    // Generate or load RSA key pair
    privateKey, publicKey, keyID := generateOrLoadKeyPair(config)
    
    service := &jwtService{
        logger:     logger,
        config:     config,
        tokenRepo:  tokenRepo,
        signingKey: privateKey,
        publicKey:  publicKey,
        keyID:      keyID,
        blacklist:  make(map[string]time.Time),
    }
    
    // Start cleanup goroutine for blacklist
    go service.cleanupBlacklist()
    
    return service
}

// GenerateToken creates a new JWT token
func (s *jwtService) GenerateToken(claims *SecureJWTClaims) (string, error) {
    // Set standard claims
    now := time.Now()
    claims.RegisteredClaims = jwt.RegisteredClaims{
        ID:        uuid.New().String(),
        Issuer:    "lumen-backend",
        Subject:   claims.UserClaims.UserID,
        Audience:  []string{"lumen-frontend"},
        IssuedAt:  jwt.NewNumericDate(now),
        NotBefore: jwt.NewNumericDate(now),
        ExpiresAt: jwt.NewNumericDate(now.Add(s.config.JWTExpiry)),
    }
    
    // Create token with claims
    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    
    // Set key ID in header
    token.Header["kid"] = s.keyID
    
    // Sign token
    tokenString, err := token.SignedString(s.signingKey)
    if err != nil {
        return "", errors.Wrap(err, "failed to sign JWT token")
    }
    
    // Store token metadata in database
    tokenRecord := &repository.Token{
        ID:        claims.RegisteredClaims.ID,
        UserID:    claims.UserClaims.UserID,
        TokenHash: s.hashToken(tokenString),
        Type:      "access",
        ExpiresAt: claims.RegisteredClaims.ExpiresAt.Time,
        CreatedAt: now,
        Metadata: map[string]interface{}{
            "ip_address": claims.SessionClaims.IPAddress,
            "user_agent": claims.SessionClaims.UserAgent,
            "session_id": claims.SessionClaims.SessionID,
        },
    }
    
    if err := s.tokenRepo.Create(context.Background(), tokenRecord); err != nil {
        s.logger.Warn("Failed to store token metadata", "error", err)
    }
    
    s.logger.Debug("JWT token generated",
        "user_id", claims.UserClaims.UserID,
        "token_id", claims.RegisteredClaims.ID,
        "expires_at", claims.RegisteredClaims.ExpiresAt.Time,
    )
    
    return tokenString, nil
}

// GenerateTokenPair creates access and refresh token pair
func (s *jwtService) GenerateTokenPair(claims *SecureJWTClaims) (*TokenPair, error) {
    // Generate access token
    accessToken, err := s.GenerateToken(claims)
    if err != nil {
        return nil, errors.Wrap(err, "failed to generate access token")
    }
    
    // Generate refresh token with longer expiry
    refreshClaims := *claims
    refreshClaims.RegisteredClaims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(s.config.RefreshTokenExpiry))
    refreshClaims.RegisteredClaims.ID = uuid.New().String()
    
    refreshToken, err := s.GenerateToken(&refreshClaims)
    if err != nil {
        return nil, errors.Wrap(err, "failed to generate refresh token")
    }
    
    // Store refresh token in database
    refreshTokenRecord := &repository.Token{
        ID:        refreshClaims.RegisteredClaims.ID,
        UserID:    claims.UserClaims.UserID,
        TokenHash: s.hashToken(refreshToken),
        Type:      "refresh",
        ExpiresAt: refreshClaims.RegisteredClaims.ExpiresAt.Time,
        CreatedAt: time.Now(),
    }
    
    if err := s.tokenRepo.Create(context.Background(), refreshTokenRecord); err != nil {
        s.logger.Warn("Failed to store refresh token metadata", "error", err)
    }
    
    return &TokenPair{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        TokenType:    "Bearer",
        ExpiresIn:    int64(s.config.JWTExpiry.Seconds()),
        ExpiresAt:    claims.RegisteredClaims.ExpiresAt.Time,
        Scope:        strings.Join(claims.SecurityClaims.Scopes, " "),
    }, nil
}

// ValidateToken validates and parses a JWT token
func (s *jwtService) ValidateToken(tokenString string) (*SecureJWTClaims, error) {
    // Check blacklist first
    if s.isTokenBlacklisted(tokenString) {
        return nil, errors.NewUnauthorizedError("Token has been revoked")
    }
    
    // Parse and validate token
    token, err := jwt.ParseWithClaims(tokenString, &SecureJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        
        // Verify key ID
        if kid, ok := token.Header["kid"]; ok {
            if kid != s.keyID {
                return nil, fmt.Errorf("invalid key ID: %v", kid)
            }
        }
        
        return s.publicKey, nil
    })
    
    if err != nil {
        return nil, errors.NewUnauthorizedError("Invalid token: " + err.Error())
    }
    
    if !token.Valid {
        return nil, errors.NewUnauthorizedError("Token is not valid")
    }
    
    claims, ok := token.Claims.(*SecureJWTClaims)
    if !ok {
        return nil, errors.NewUnauthorizedError("Invalid token claims")
    }
    
    // Additional validation
    if err := s.validateClaims(claims); err != nil {
        return nil, err
    }
    
    return claims, nil
}

// RevokeToken adds a token to the blacklist
func (s *jwtService) RevokeToken(tokenID string) error {
    s.blacklistMu.Lock()
    defer s.blacklistMu.Unlock()
    
    // Add to in-memory blacklist
    s.blacklist[tokenID] = time.Now().Add(s.config.JWTExpiry)
    
    // Mark as revoked in database
    if err := s.tokenRepo.RevokeToken(context.Background(), tokenID); err != nil {
        s.logger.Warn("Failed to revoke token in database", "token_id", tokenID, "error", err)
    }
    
    s.logger.Info("Token revoked", "token_id", tokenID)
    return nil
}

// Helper methods
func (s *jwtService) hashToken(token string) string {
    hash := sha256.Sum256([]byte(token))
    return hex.EncodeToString(hash[:])
}

func (s *jwtService) isTokenBlacklisted(tokenString string) bool {
    // Extract token ID from token without full validation
    token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &SecureJWTClaims{})
    if err != nil {
        return true // Treat invalid tokens as blacklisted
    }
    
    claims, ok := token.Claims.(*SecureJWTClaims)
    if !ok {
        return true
    }
    
    s.blacklistMu.RLock()
    defer s.blacklistMu.RUnlock()
    
    _, exists := s.blacklist[claims.RegisteredClaims.ID]
    return exists
}

func (s *jwtService) validateClaims(claims *SecureJWTClaims) error {
    // Validate user ID
    if claims.UserClaims.UserID == "" {
        return errors.NewUnauthorizedError("Missing user ID in token")
    }
    
    // Validate session ID
    if claims.SessionClaims.SessionID == "" {
        return errors.NewUnauthorizedError("Missing session ID in token")
    }
    
    // Validate role
    if claims.SecurityClaims.Role == "" {
        return errors.NewUnauthorizedError("Missing role in token")
    }
    
    return nil
}

func (s *jwtService) cleanupBlacklist() {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()
    
    for range ticker.C {
        s.blacklistMu.Lock()
        now := time.Now()
        for tokenID, expiry := range s.blacklist {
            if now.After(expiry) {
                delete(s.blacklist, tokenID)
            }
        }
        s.blacklistMu.Unlock()
    }
}

func generateOrLoadKeyPair(config *SecurityConfig) (*rsa.PrivateKey, *rsa.PublicKey, string) {
    // In production, load from secure storage
    // For demo, generate new key pair
    privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
    if err != nil {
        panic("Failed to generate RSA key pair: " + err.Error())
    }
    
    keyID := uuid.New().String()
    return privateKey, &privateKey.PublicKey, keyID
}
```

## Password Service

### Secure Password Handling

```go
// PasswordService handles password operations
type PasswordService interface {
    // Password hashing
    HashPassword(password string) (string, error)
    VerifyPassword(password, hash string) bool
    
    // Password validation
    ValidatePassword(password string) error
    ValidatePasswordStrength(password string) (*PasswordStrength, error)
    
    // Password generation
    GenerateSecurePassword(length int) (string, error)
    GenerateTemporaryPassword() (string, error)
    
    // Password policies
    CheckPasswordPolicy(password string, userInfo *UserInfo) error
    GetPasswordPolicy() *PasswordPolicy
}

type PasswordStrength struct {
    Score       int      `json:"score"`        // 0-4 (weak to strong)
    Feedback    []string `json:"feedback"`    // Improvement suggestions
    Entropy     float64  `json:"entropy"`     // Bits of entropy
    TimeToCrack string   `json:"time_to_crack"` // Estimated crack time
}

type PasswordPolicy struct {
    MinLength        int  `json:"min_length"`
    RequireUppercase bool `json:"require_uppercase"`
    RequireLowercase bool `json:"require_lowercase"`
    RequireDigits    bool `json:"require_digits"`
    RequireSymbols   bool `json:"require_symbols"`
    MaxLength        int  `json:"max_length"`
    PreventReuse     int  `json:"prevent_reuse"`     // Number of previous passwords to check
    ExpiryDays       int  `json:"expiry_days"`       // Password expiry in days
}

type UserInfo struct {
    Email     string   `json:"email"`
    FirstName string   `json:"first_name"`
    LastName  string   `json:"last_name"`
    Username  string   `json:"username"`
    PreviousPasswords []string `json:"previous_passwords"`
}

// passwordService implements PasswordService
type passwordService struct {
    logger logger.Logger
    config *SecurityConfig
    policy *PasswordPolicy
}

// NewPasswordService creates a new password service
func NewPasswordService(logger logger.Logger, config *SecurityConfig) PasswordService {
    policy := &PasswordPolicy{
        MinLength:        config.PasswordMinLength,
        RequireUppercase: config.PasswordRequireUpper,
        RequireLowercase: config.PasswordRequireLower,
        RequireDigits:    config.PasswordRequireDigit,
        RequireSymbols:   config.PasswordRequireSymbol,
        MaxLength:        128,
        PreventReuse:     5,
        ExpiryDays:       90,
    }
    
    return &passwordService{
        logger: logger,
        config: config,
        policy: policy,
    }
}

// HashPassword creates a secure hash of the password
func (s *passwordService) HashPassword(password string) (string, error) {
    // Use Argon2id for new passwords (more secure than bcrypt)
    salt := make([]byte, 32)
    if _, err := rand.Read(salt); err != nil {
        return "", errors.Wrap(err, "failed to generate salt")
    }
    
    // Argon2id parameters (adjust based on security requirements)
    hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
    
    // Encode as: $argon2id$v=19$m=65536,t=1,p=4$salt$hash
    encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version,
        64*1024, // memory
        1,       // time
        4,       // parallelism
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    )
    
    return encoded, nil
}

// VerifyPassword verifies a password against its hash
func (s *passwordService) VerifyPassword(password, hash string) bool {
    // Support both Argon2id and bcrypt for backward compatibility
    if strings.HasPrefix(hash, "$argon2id$") {
        return s.verifyArgon2Password(password, hash)
    } else if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") {
        return s.verifyBcryptPassword(password, hash)
    }
    
    return false
}

func (s *passwordService) verifyArgon2Password(password, hash string) bool {
    // Parse Argon2id hash
    parts := strings.Split(hash, "$")
    if len(parts) != 6 {
        return false
    }
    
    // Extract parameters
    var memory, time, parallelism uint32
    if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &parallelism); err != nil {
        return false
    }
    
    // Decode salt and hash
    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil {
        return false
    }
    
    expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil {
        return false
    }
    
    // Compute hash with same parameters
    computedHash := argon2.IDKey([]byte(password), salt, time, memory, uint8(parallelism), uint32(len(expectedHash)))
    
    // Constant-time comparison
    return subtle.ConstantTimeCompare(expectedHash, computedHash) == 1
}

func (s *passwordService) verifyBcryptPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// ValidatePassword validates password against policy
func (s *passwordService) ValidatePassword(password string) error {
    if len(password) < s.policy.MinLength {
        return errors.NewValidationError(fmt.Sprintf("Password must be at least %d characters long", s.policy.MinLength))
    }
    
    if len(password) > s.policy.MaxLength {
        return errors.NewValidationError(fmt.Sprintf("Password must be no more than %d characters long", s.policy.MaxLength))
    }
    
    if s.policy.RequireUppercase && !regexp.MustMatch(`[A-Z]`, []byte(password)) {
        return errors.NewValidationError("Password must contain at least one uppercase letter")
    }
    
    if s.policy.RequireLowercase && !regexp.MustMatch(`[a-z]`, []byte(password)) {
        return errors.NewValidationError("Password must contain at least one lowercase letter")
    }
    
    if s.policy.RequireDigits && !regexp.MustMatch(`[0-9]`, []byte(password)) {
        return errors.NewValidationError("Password must contain at least one digit")
    }
    
    if s.policy.RequireSymbols && !regexp.MustMatch(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`, []byte(password)) {
        return errors.NewValidationError("Password must contain at least one special character")
    }
    
    return nil
}

// ValidatePasswordStrength analyzes password strength
func (s *passwordService) ValidatePasswordStrength(password string) (*PasswordStrength, error) {
    strength := &PasswordStrength{
        Feedback: make([]string, 0),
    }
    
    // Calculate entropy
    strength.Entropy = s.calculateEntropy(password)
    
    // Score based on entropy and length
    switch {
    case strength.Entropy < 30:
        strength.Score = 0
        strength.TimeToCrack = "Instantly"
        strength.Feedback = append(strength.Feedback, "Very weak password")
    case strength.Entropy < 50:
        strength.Score = 1
        strength.TimeToCrack = "Minutes"
        strength.Feedback = append(strength.Feedback, "Weak password")
    case strength.Entropy < 70:
        strength.Score = 2
        strength.TimeToCrack = "Hours"
        strength.Feedback = append(strength.Feedback, "Fair password")
    case strength.Entropy < 90:
        strength.Score = 3
        strength.TimeToCrack = "Years"
        strength.Feedback = append(strength.Feedback, "Good password")
    default:
        strength.Score = 4
        strength.TimeToCrack = "Centuries"
        strength.Feedback = append(strength.Feedback, "Strong password")
    }
    
    // Add specific feedback
    if len(password) < 12 {
        strength.Feedback = append(strength.Feedback, "Consider using a longer password")
    }
    
    if !regexp.MustMatch(`[A-Z]`, []byte(password)) {
        strength.Feedback = append(strength.Feedback, "Add uppercase letters")
    }
    
    if !regexp.MustMatch(`[a-z]`, []byte(password)) {
        strength.Feedback = append(strength.Feedback, "Add lowercase letters")
    }
    
    if !regexp.MustMatch(`[0-9]`, []byte(password)) {
        strength.Feedback = append(strength.Feedback, "Add numbers")
    }
    
    if !regexp.MustMatch(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`, []byte(password)) {
        strength.Feedback = append(strength.Feedback, "Add special characters")
    }
    
    return strength, nil
}

// GenerateSecurePassword generates a cryptographically secure password
func (s *passwordService) GenerateSecurePassword(length int) (string, error) {
    if length < 8 {
        length = 8
    }
    if length > 128 {
        length = 128
    }
    
    // Character sets
    lowercase := "abcdefghijklmnopqrstuvwxyz"
    uppercase := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits := "0123456789"
    symbols := "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    // Ensure at least one character from each required set
    var password strings.Builder
    allChars := lowercase + uppercase + digits + symbols
    
    // Add required characters
    if s.policy.RequireLowercase {
        char, err := s.randomChar(lowercase)
        if err != nil {
            return "", err
        }
        password.WriteByte(char)
    }
    
    if s.policy.RequireUppercase {
        char, err := s.randomChar(uppercase)
        if err != nil {
            return "", err
        }
        password.WriteByte(char)
    }
    
    if s.policy.RequireDigits {
        char, err := s.randomChar(digits)
        if err != nil {
            return "", err
        }
        password.WriteByte(char)
    }
    
    if s.policy.RequireSymbols {
        char, err := s.randomChar(symbols)
        if err != nil {
            return "", err
        }
        password.WriteByte(char)
    }
    
    // Fill remaining length with random characters
    for password.Len() < length {
        char, err := s.randomChar(allChars)
        if err != nil {
            return "", err
        }
        password.WriteByte(char)
    }
    
    // Shuffle the password
    passwordBytes := []byte(password.String())
    for i := len(passwordBytes) - 1; i > 0; i-- {
        j, err := s.randomInt(i + 1)
        if err != nil {
            return "", err
        }
        passwordBytes[i], passwordBytes[j] = passwordBytes[j], passwordBytes[i]
    }
    
    return string(passwordBytes), nil
}

// Helper methods
func (s *passwordService) calculateEntropy(password string) float64 {
    // Character set size
    charsetSize := 0
    
    if regexp.MustMatch(`[a-z]`, []byte(password)) {
        charsetSize += 26
    }
    if regexp.MustMatch(`[A-Z]`, []byte(password)) {
        charsetSize += 26
    }
    if regexp.MustMatch(`[0-9]`, []byte(password)) {
        charsetSize += 10
    }
    if regexp.MustMatch(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`, []byte(password)) {
        charsetSize += 32
    }
    
    if charsetSize == 0 {
        return 0
    }
    
    // Entropy = log2(charset_size^length)
    import "math"
    return float64(len(password)) * math.Log2(float64(charsetSize))
}

func (s *passwordService) randomChar(charset string) (byte, error) {
    if len(charset) == 0 {
        return 0, errors.New("empty charset")
    }
    
    index, err := s.randomInt(len(charset))
    if err != nil {
        return 0, err
    }
    
    return charset[index], nil
}

func (s *passwordService) randomInt(max int) (int, error) {
    if max <= 0 {
        return 0, errors.New("max must be positive")
    }
    
    // Use crypto/rand for cryptographically secure random numbers
    bigInt, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
    if err != nil {
        return 0, err
    }
    
    return int(bigInt.Int64()), nil
}
```

## Adding New Security Features

### Step 1: Define Security Interface

```go
// BiometricService handles biometric authentication
type BiometricService interface {
    // Biometric registration
    RegisterBiometric(ctx context.Context, userID string, biometricData *BiometricData) error
    
    // Biometric authentication
    AuthenticateBiometric(ctx context.Context, userID string, biometricData *BiometricData) (*BiometricResult, error)
    
    // Biometric management
    ListUserBiometrics(ctx context.Context, userID string) ([]*BiometricInfo, error)
    RemoveBiometric(ctx context.Context, userID string, biometricID string) error
    
    // Biometric validation
    ValidateBiometricData(biometricData *BiometricData) error
}

type BiometricData struct {
    Type        string `json:"type"`         // fingerprint, face, voice
    Data        []byte `json:"data"`         // Encrypted biometric template
    Quality     int    `json:"quality"`      // Quality score 0-100
    DeviceInfo  string `json:"device_info"`  // Device information
    Timestamp   time.Time `json:"timestamp"`  // Capture timestamp
}

type BiometricResult struct {
    Matched     bool    `json:"matched"`
    Confidence  float64 `json:"confidence"`  // Confidence score 0.0-1.0
    BiometricID string  `json:"biometric_id"`
}

type BiometricInfo struct {
    ID          string    `json:"id"`
    Type        string    `json:"type"`
    Quality     int       `json:"quality"`
    DeviceInfo  string    `json:"device_info"`
    RegisteredAt time.Time `json:"registered_at"`
    LastUsedAt  *time.Time `json:"last_used_at"`
}
```

### Step 2: Implement Security Service

```go
// biometricService implements BiometricService
type biometricService struct {
    logger           logger.Logger
    config           *SecurityConfig
    biometricRepo    repository.BiometricRepository
    encryptionService EncryptionService
    auditService     AuditService
}

// NewBiometricService creates a new biometric service
func NewBiometricService(
    logger logger.Logger,
    config *SecurityConfig,
    biometricRepo repository.BiometricRepository,
    encryptionService EncryptionService,
    auditService AuditService,
) BiometricService {
    return &biometricService{
        logger:           logger,
        config:           config,
        biometricRepo:    biometricRepo,
        encryptionService: encryptionService,
        auditService:     auditService,
    }
}

// RegisterBiometric registers a new biometric template
func (s *biometricService) RegisterBiometric(ctx context.Context, userID string, biometricData *BiometricData) error {
    // Validate biometric data
    if err := s.ValidateBiometricData(biometricData); err != nil {
        return err
    }
    
    // Encrypt biometric template
    encryptedData, err := s.encryptionService.Encrypt(biometricData.Data)
    if err != nil {
        return errors.Wrap(err, "failed to encrypt biometric data")
    }
    
    // Store in repository
    biometric := &repository.Biometric{
        ID:           uuid.New().String(),
        UserID:       userID,
        Type:         biometricData.Type,
        EncryptedData: encryptedData,
        Quality:      biometricData.Quality,
        DeviceInfo:   biometricData.DeviceInfo,
        RegisteredAt: time.Now(),
    }
    
    if err := s.biometricRepo.Create(ctx, biometric); err != nil {
        return errors.Wrap(err, "failed to store biometric")
    }
    
    // Audit log
    s.auditService.LogSecurityEvent(ctx, &SecurityEvent{
        Type:        "biometric_registered",
        UserID:      userID,
        Description: fmt.Sprintf("Biometric %s registered", biometricData.Type),
        Metadata: map[string]interface{}{
            "biometric_id":   biometric.ID,
            "biometric_type": biometricData.Type,
            "quality":        biometricData.Quality,
        },
    })
    
    return nil
}
```

### Step 3: Register in Security Manager

```go
// Update SecurityManager interface
type SecurityManager interface {
    // ... existing methods ...
    
    // Biometric services
    GetBiometricService() BiometricService
}

// Update securityManager implementation
func NewSecurityManager(...) SecurityManager {
    sm := &securityManager{
        // ... existing initialization ...
    }
    
    // ... existing service initialization ...
    
    // Initialize biometric service
    sm.biometricService = NewBiometricService(logger, config, biometricRepo, sm.encryptionService, sm.auditService)
    
    return sm
}

func (sm *securityManager) GetBiometricService() BiometricService {
    return sm.biometricService
}
```

## Development Workflow

### 1. Security Development Pattern

```bash
# 1. Define security interface
vim internal/security/interfaces.go

# 2. Implement security service
vim internal/security/biometric_service.go

# 3. Add security tests
vim internal/security/biometric_service_test.go

# 4. Update security manager
vim internal/security/manager.go

# 5. Add integration tests
vim internal/security/integration_test.go

# 6. Run security tests
go test ./internal/security/...

# 7. Run security benchmarks
go test -bench=. ./internal/security/...
```

### 2. Security Testing

```go
// security_test.go
func TestJWTService_GenerateAndValidateToken(t *testing.T) {
    service := setupTestJWTService()
    
    claims := &SecureJWTClaims{
        UserClaims: UserClaims{
            UserID: "user-123",
            Email:  "test@example.com",
        },
        SecurityClaims: SecurityClaims{
            Role:        "user",
            Permissions: []string{"read", "write"},
        },
        SessionClaims: SessionClaims{
            SessionID: "session-123",
            IssuedAt:  time.Now(),
            ExpiresAt: time.Now().Add(1 * time.Hour),
        },
    }
    
    // Generate token
    token, err := service.GenerateToken(claims)
    require.NoError(t, err)
    require.NotEmpty(t, token)
    
    // Validate token
    validatedClaims, err := service.ValidateToken(token)
    require.NoError(t, err)
    require.Equal(t, claims.UserClaims.UserID, validatedClaims.UserClaims.UserID)
    require.Equal(t, claims.SecurityClaims.Role, validatedClaims.SecurityClaims.Role)
}

func TestPasswordService_HashAndVerify(t *testing.T) {
    service := setupTestPasswordService()
    
    password := "SecurePassword123!"
    
    // Hash password
    hash, err := service.HashPassword(password)
    require.NoError(t, err)
    require.NotEmpty(t, hash)
    
    // Verify correct password
    assert.True(t, service.VerifyPassword(password, hash))
    
    // Verify incorrect password
    assert.False(t, service.VerifyPassword("WrongPassword", hash))
}

// Benchmark tests
func BenchmarkPasswordService_HashPassword(b *testing.B) {
    service := setupTestPasswordService()
    password := "BenchmarkPassword123!"
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = service.HashPassword(password)
    }
}

func BenchmarkJWTService_GenerateToken(b *testing.B) {
    service := setupTestJWTService()
    claims := &SecureJWTClaims{
        UserClaims: UserClaims{UserID: "user-123"},
        SecurityClaims: SecurityClaims{Role: "user"},
        SessionClaims: SessionClaims{SessionID: "session-123"},
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = service.GenerateToken(claims)
    }
}
```

## Best Practices

### 1. Secure Coding

```go
// Always use constant-time comparisons for sensitive data
if subtle.ConstantTimeCompare(expected, actual) != 1 {
    return errors.NewUnauthorizedError("Invalid credentials")
}

// Use cryptographically secure random generation
token := make([]byte, 32)
if _, err := rand.Read(token); err != nil {
    return errors.Wrap(err, "failed to generate secure token")
}

// Properly handle sensitive data in memory
defer func() {
    // Clear sensitive data from memory
    for i := range password {
        password[i] = 0
    }
}()

// Use secure defaults
config := &SecurityConfig{
    JWTExpiry:          15 * time.Minute,  // Short-lived access tokens
    RefreshTokenExpiry: 7 * 24 * time.Hour, // Longer refresh tokens
    PasswordMinLength:  12,                  // Strong password requirement
    RateLimitRPS:       10,                  // Conservative rate limiting
}
```

### 2. Error Handling

```go
// Don't leak sensitive information in error messages
if !s.verifyPassword(password, user.PasswordHash) {
    // Don't reveal whether user exists or password is wrong
    return errors.NewUnauthorizedError("Invalid credentials")
}

// Log security events for monitoring
s.auditService.LogSecurityEvent(ctx, &SecurityEvent{
    Type:        "authentication_failed",
    UserID:      userID,
    IPAddress:   getClientIP(ctx),
    Description: "Failed login attempt",
    Severity:    "medium",
})
```

### 3. Performance Considerations

```go
// Use appropriate hashing parameters
// Argon2id parameters should be tuned based on available resources
func (s *passwordService) getArgon2Params() (memory, time, parallelism uint32) {
    // Adjust based on server capacity
    return 64 * 1024, 1, 4 // 64MB memory, 1 iteration, 4 threads
}

// Cache frequently accessed security data
func (s *jwtService) getPublicKey() (*rsa.PublicKey, error) {
    s.keyMu.RLock()
    if s.cachedPublicKey != nil {
        defer s.keyMu.RUnlock()
        return s.cachedPublicKey, nil
    }
    s.keyMu.RUnlock()
    
    // Load and cache public key
    // ...
}
```

This security package provides a comprehensive foundation for implementing secure authentication, authorization, and protection mechanisms. Follow these patterns and best practices when adding new security features to maintain the highest security standards.