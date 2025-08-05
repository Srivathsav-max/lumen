package security

import (
	"fmt"
	"html"
	"log/slog"
	"net/url"
	"regexp"
	"strings"
)

type XSSService struct {
	logger *slog.Logger
	config *XSSConfig
}

type XSSConfig struct {
	Enabled bool `json:"enabled"`

	SanitizeInput bool `json:"sanitize_input"`

	EncodeOutput bool `json:"encode_output"`

	AllowedTags []string `json:"allowed_tags"`

	AllowedAttributes []string `json:"allowed_attributes"`

	AllowedProtocols []string `json:"allowed_protocols"`

	StrictMode bool `json:"strict_mode"`

	CustomPatterns []string `json:"custom_patterns"`
}

type SanitizationResult struct {
	Original  string   `json:"original"`
	Sanitized string   `json:"sanitized"`
	Modified  bool     `json:"modified"`
	Threats   []string `json:"threats,omitempty"`
	Severity  string   `json:"severity,omitempty"`
}

func NewXSSService(config *XSSConfig, logger *slog.Logger) *XSSService {
	if config == nil {
		config = DefaultXSSConfig()
	}

	return &XSSService{
		logger: logger,
		config: config,
	}
}

func DefaultXSSConfig() *XSSConfig {
	return &XSSConfig{
		Enabled:       true,
		SanitizeInput: true,
		EncodeOutput:  true,
		AllowedTags: []string{
			"p", "br", "strong", "em", "u", "i", "b",
			"ul", "ol", "li", "blockquote", "code", "pre",
		},
		AllowedAttributes: []string{
			"href", "title", "alt", "class", "id",
		},
		AllowedProtocols: []string{
			"http", "https", "mailto",
		},
		StrictMode: false,
		CustomPatterns: []string{
			`(?i)<script[^>]*>.*?</script>`,
			`(?i)javascript:`,
			`(?i)vbscript:`,
			`(?i)data:text/html`,
			`(?i)on\w+\s*=`,

			`(?i)<iframe[^>]*>`,
			`(?i)<object[^>]*>`,
			`(?i)<embed[^>]*>`,
			`(?i)<form[^>]*>`,
			`(?i)<meta[^>]*>`,

			`(?i)expression\s*\(`,
			`(?i)@import`,
			`(?i)url\s*\(`,

			`(?i)(select|insert|update|delete|drop|create|alter)\s+`,
			`(?i)(union|or|and)\s+\d+\s*=\s*\d+`,
			`(?i)'\s*(or|and)\s+'`,
		},
	}
}

func (s *XSSService) SanitizeInput(input string) *SanitizationResult {
	if !s.config.Enabled {
		return &SanitizationResult{
			Original:  input,
			Sanitized: input,
			Modified:  false,
		}
	}

	result := &SanitizationResult{
		Original:  input,
		Sanitized: input,
		Modified:  false,
		Threats:   []string{},
	}

	threats := s.detectThreats(input)
	if len(threats) > 0 {
		result.Threats = threats
		result.Severity = s.calculateSeverity(threats)

		s.logger.Warn("XSS threats detected in input",
			"threats", threats,
			"severity", result.Severity,
			"input_length", len(input),
		)
	}

	sanitized := input

	if s.config.StrictMode {
		sanitized = s.stripAllHTML(sanitized)
	} else {
		sanitized = s.removeScriptTags(sanitized)
		sanitized = s.removeEventHandlers(sanitized)
		sanitized = s.sanitizeAttributes(sanitized)
		sanitized = s.sanitizeURLs(sanitized)
		sanitized = s.filterAllowedTags(sanitized)
	}

	if s.config.EncodeOutput {
		sanitized = s.encodeSpecialCharacters(sanitized)
	}

	result.Modified = (sanitized != input)
	result.Sanitized = sanitized

	if result.Modified {
		s.logger.Debug("Input sanitized",
			"original_length", len(input),
			"sanitized_length", len(sanitized),
			"threats_found", len(threats),
		)
	}

	return result
}

func (s *XSSService) SanitizeJSON(data interface{}) interface{} {
	switch v := data.(type) {
	case string:
		result := s.SanitizeInput(v)
		return result.Sanitized
	case map[string]interface{}:
		sanitized := make(map[string]interface{})
		for key, value := range v {
			sanitizedKey := s.SanitizeInput(key).Sanitized
			sanitized[sanitizedKey] = s.SanitizeJSON(value)
		}
		return sanitized
	case []interface{}:
		sanitized := make([]interface{}, len(v))
		for i, value := range v {
			sanitized[i] = s.SanitizeJSON(value)
		}
		return sanitized
	default:
		return v // Numbers, booleans, nil remain unchanged
	}
}

func (s *XSSService) ValidateInput(input string) bool {
	threats := s.detectThreats(input)
	return len(threats) == 0
}

func (s *XSSService) detectThreats(input string) []string {
	var threats []string

	for _, pattern := range s.config.CustomPatterns {
		if matched, err := regexp.MatchString(pattern, input); err == nil && matched {
			threats = append(threats, s.getThreatType(pattern))
		}
	}

	threats = append(threats, s.detectScriptInjection(input)...)
	threats = append(threats, s.detectHTMLInjection(input)...)
	threats = append(threats, s.detectCSSInjection(input)...)
	threats = append(threats, s.detectProtocolInjection(input)...)

	return s.deduplicateThreats(threats)
}

func (s *XSSService) detectScriptInjection(input string) []string {
	var threats []string

	patterns := []struct {
		pattern string
		threat  string
	}{
		{`(?i)<script`, "script_tag"},
		{`(?i)javascript:`, "javascript_protocol"},
		{`(?i)vbscript:`, "vbscript_protocol"},
		{`(?i)on\w+\s*=`, "event_handler"},
		{`(?i)eval\s*\(`, "eval_function"},
		{`(?i)setTimeout\s*\(`, "settimeout_function"},
		{`(?i)setInterval\s*\(`, "setinterval_function"},
		{`(?i)Function\s*\(`, "function_constructor"},
	}

	for _, p := range patterns {
		if matched, _ := regexp.MatchString(p.pattern, input); matched {
			threats = append(threats, p.threat)
		}
	}

	return threats
}

func (s *XSSService) detectHTMLInjection(input string) []string {
	var threats []string

	patterns := []struct {
		pattern string
		threat  string
	}{
		{`(?i)<iframe`, "iframe_tag"},
		{`(?i)<object`, "object_tag"},
		{`(?i)<embed`, "embed_tag"},
		{`(?i)<form`, "form_tag"},
		{`(?i)<meta`, "meta_tag"},
		{`(?i)<link`, "link_tag"},
		{`(?i)<svg`, "svg_tag"},
		{`(?i)<math`, "math_tag"},
	}

	for _, p := range patterns {
		if matched, _ := regexp.MatchString(p.pattern, input); matched {
			threats = append(threats, p.threat)
		}
	}

	return threats
}

func (s *XSSService) detectCSSInjection(input string) []string {
	var threats []string

	patterns := []struct {
		pattern string
		threat  string
	}{
		{`(?i)expression\s*\(`, "css_expression"},
		{`(?i)@import`, "css_import"},
		{`(?i)url\s*\(`, "css_url"},
		{`(?i)-moz-binding`, "css_binding"},
		{`(?i)behavior\s*:`, "css_behavior"},
	}

	for _, p := range patterns {
		if matched, _ := regexp.MatchString(p.pattern, input); matched {
			threats = append(threats, p.threat)
		}
	}

	return threats
}

func (s *XSSService) detectProtocolInjection(input string) []string {
	var threats []string

	dangerousProtocols := []string{
		"data:", "file:", "ftp:", "gopher:", "ldap:",
		"chrome:", "resource:", "moz-icon:", "jar:",
	}

	lowerInput := strings.ToLower(input)
	for _, protocol := range dangerousProtocols {
		if strings.Contains(lowerInput, protocol) {
			threats = append(threats, "dangerous_protocol")
			break
		}
	}

	return threats
}

func (s *XSSService) removeScriptTags(input string) string {
	scriptRegex := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	return scriptRegex.ReplaceAllString(input, "")
}

func (s *XSSService) removeEventHandlers(input string) string {
	eventRegex := regexp.MustCompile(`(?i)\s+on\w+\s*=\s*["\'][^"\']*["\']`)
	return eventRegex.ReplaceAllString(input, "")
}

func (s *XSSService) sanitizeAttributes(input string) string {
	styleRegex := regexp.MustCompile(`(?i)\s+style\s*=\s*["\'][^"\']*["\']`)
	input = styleRegex.ReplaceAllString(input, "")

	imgRegex := regexp.MustCompile(`(?i)<img[^>]*>`)
	imgTags := imgRegex.FindAllString(input, -1)
	input = imgRegex.ReplaceAllString(input, "PROTECTED_IMG_TAG")

	srcRegex := regexp.MustCompile(`(?i)\s+src\s*=\s*["\'][^"\']*["\']`)
	input = srcRegex.ReplaceAllString(input, "")

	for i, imgTag := range imgTags {
		input = strings.Replace(input, "PROTECTED_IMG_TAG", imgTag, 1)
		_ = i
	}

	return input
}

func (s *XSSService) sanitizeURLs(input string) string {
	urlRegex := regexp.MustCompile(`(?i)(href|src)\s*=\s*["\']([^"\']*)["\']`)

	return urlRegex.ReplaceAllStringFunc(input, func(match string) string {
		parts := urlRegex.FindStringSubmatch(match)
		if len(parts) != 3 {
			return ""
		}

		attr := parts[1]
		urlStr := parts[2]

		if parsedURL, err := url.Parse(urlStr); err == nil {
			if s.isProtocolAllowed(parsedURL.Scheme) {
				return fmt.Sprintf(`%s="%s"`, attr, html.EscapeString(parsedURL.String()))
			}
		}

		return ""
	})
}

func (s *XSSService) filterAllowedTags(input string) string {
	if len(s.config.AllowedTags) == 0 {
		return s.stripAllHTML(input)
	}
	tagRegex := regexp.MustCompile(`(?i)</?([a-zA-Z][a-zA-Z0-9]*)[^>]*>`)

	return tagRegex.ReplaceAllStringFunc(input, func(match string) string {
		tagMatches := tagRegex.FindStringSubmatch(match)
		if len(tagMatches) < 2 {
			return ""
		}

		tagName := strings.ToLower(tagMatches[1])

		for _, allowedTag := range s.config.AllowedTags {
			if tagName == strings.ToLower(allowedTag) {
				return match
			}
		}

		return ""
	})
}

func (s *XSSService) stripAllHTML(input string) string {
	tagRegex := regexp.MustCompile(`<[^>]*>`)
	input = tagRegex.ReplaceAllString(input, "")

	input = html.UnescapeString(input)
	input = html.EscapeString(input)

	return input
}

func (s *XSSService) encodeSpecialCharacters(input string) string {
	input = html.EscapeString(input)

	replacements := map[string]string{
		"'":  "&#x27;",
		`"`:  "&#x22;",
		"/":  "&#x2F;",
		"\\": "&#x5C;",
	}

	for old, new := range replacements {
		input = strings.ReplaceAll(input, old, new)
	}

	return input
}

func (s *XSSService) isProtocolAllowed(protocol string) bool {
	if protocol == "" {
		return true
	}

	protocol = strings.ToLower(protocol)
	for _, allowed := range s.config.AllowedProtocols {
		if protocol == strings.ToLower(allowed) {
			return true
		}
	}

	return false
}

func (s *XSSService) calculateSeverity(threats []string) string {
	if len(threats) == 0 {
		return "none"
	}

	highRiskThreats := []string{
		"script_tag", "javascript_protocol", "eval_function",
		"function_constructor", "iframe_tag", "object_tag",
	}

	for _, threat := range threats {
		for _, highRisk := range highRiskThreats {
			if threat == highRisk {
				return "high"
			}
		}
	}

	if len(threats) > 3 {
		return "medium"
	}

	return "low"
}

func (s *XSSService) getThreatType(pattern string) string {
	threatMap := map[string]string{
		`(?i)<script[^>]*>.*?</script>`: "script_tag",
		`(?i)javascript:`:               "javascript_protocol",
		`(?i)vbscript:`:                 "vbscript_protocol",
		`(?i)on\w+\s*=`:                 "event_handler",
		`(?i)<iframe[^>]*>`:             "iframe_tag",
		`(?i)expression\s*\(`:           "css_expression",
	}

	if threat, exists := threatMap[pattern]; exists {
		return threat
	}

	return "unknown_threat"
}

func (s *XSSService) deduplicateThreats(threats []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, threat := range threats {
		if !seen[threat] {
			seen[threat] = true
			result = append(result, threat)
		}
	}

	return result
}
