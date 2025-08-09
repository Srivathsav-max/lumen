package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/google/uuid"
	pdf "github.com/ledongthuc/pdf"
	"github.com/tmc/langchaingo/textsplitter"
)

// Appwrite minimal client
type AppwriteConfig struct {
	Endpoint  string
	ProjectID string
	APIKey    string
}

type KnowledgeServices struct {
	httpClient *http.Client
	logger     *slog.Logger
	aiCfg      *config.AIConfig
	appwrite   AppwriteConfig

	docRepo   repository.KnowledgeDocumentRepository
	chunkRepo repository.KnowledgeChunkRepository
	embRepo   repository.KnowledgeEmbeddingRepository
}

func NewKnowledgeServices(aiCfg *config.AIConfig, appwrite AppwriteConfig, docRepo repository.KnowledgeDocumentRepository, chunkRepo repository.KnowledgeChunkRepository, embRepo repository.KnowledgeEmbeddingRepository, logger *slog.Logger) (*KnowledgeServices, error) {
	return &KnowledgeServices{
		httpClient: &http.Client{Timeout: 60 * time.Second},
		logger:     logger,
		aiCfg:      aiCfg,
		appwrite:   appwrite,
		docRepo:    docRepo,
		chunkRepo:  chunkRepo,
		embRepo:    embRepo,
	}, nil
}

// BeginIngestion: records the upload reference
func (s *KnowledgeServices) BeginIngestion(ctx context.Context, userID int64, req *BeginIngestionRequest) (*KnowledgeDocumentResponse, error) {
	doc := &repository.KnowledgeDocument{
		UserID:           userID,
		WorkspaceID:      req.WorkspaceID,
		AppwriteBucketID: req.AppwriteBucketID,
		AppwriteFileID:   req.AppwriteFileID,
		OriginalFilename: req.OriginalFilename,
		MimeType:         req.MimeType,
		SizeBytes:        req.SizeBytes,
		Status:           "uploaded",
		Metadata:         json.RawMessage("{}"),
	}
	if err := s.docRepo.Create(ctx, doc); err != nil {
		return nil, err
	}
	return &KnowledgeDocumentResponse{ID: doc.ID, Status: doc.Status}, nil
}

// ParseAndChunk: calls Google content parser (docAI/gemini parser) after downloading the file from Appwrite
func (s *KnowledgeServices) ParseAndChunk(ctx context.Context, documentID string) error {
	d, err := s.docRepo.GetByID(ctx, documentID)
	if err != nil {
		return err
	}
	if d == nil {
		return fmt.Errorf("document not found")
	}
	_ = s.docRepo.UpdateStatus(ctx, documentID, "parsing", nil)

	// Download file from Appwrite storage
	fileBytes, err := s.downloadFromAppwrite(ctx, d.AppwriteBucketID, d.AppwriteFileID)
	if err != nil {
		_ = s.docRepo.UpdateStatus(ctx, documentID, "failed", json.RawMessage(fmt.Sprintf(`{"error":"%s"}`, escapeJSON(err.Error()))))
		return err
	}

	// Use Google parser via Gemini "file contents" endpoint (simplified). In practice, use Google Document AI or Gemini file API.
	parts, pageCount, err := s.parseWithGeminiParser(ctx, fileBytes, d.MimeType)
	if err != nil {
		_ = s.docRepo.UpdateStatus(ctx, documentID, "failed", json.RawMessage(fmt.Sprintf(`{"error":"%s"}`, escapeJSON(err.Error()))))
		return err
	}

	// Chunking: LangChainGo recursive character splitter with overlap and token approximation
	var chunks []*repository.KnowledgeChunk
	chunkIndex := 0
	const chunkSizeChars = 2000
	const chunkOverlapChars = 200
	splitter := textsplitter.NewRecursiveCharacter(
		textsplitter.WithChunkSize(chunkSizeChars),
		textsplitter.WithChunkOverlap(chunkOverlapChars),
	)
	for _, p := range parts {
		text := strings.TrimSpace(p.Text)
		if text == "" {
			continue
		}
		subChunks, _ := splitter.SplitText(text)
		pageNum := p.PageNumber
		for _, sc := range subChunks {
			sc = strings.TrimSpace(sc)
			if sc == "" {
				continue
			}
			tokenCount := approxTokenCount(sc)
			chunks = append(chunks, &repository.KnowledgeChunk{
				DocumentID: d.ID,
				ChunkIndex: chunkIndex,
				Text:       sc,
				PageNumber: &pageNum,
				StartChar:  nil,
				EndChar:    nil,
				TokenCount: tokenCount,
			})
			chunkIndex++
		}
	}
	if err := s.chunkRepo.CreateBulk(ctx, chunks); err != nil {
		_ = s.docRepo.UpdateStatus(ctx, documentID, "failed", json.RawMessage(fmt.Sprintf(`{"error":"%s"}`, escapeJSON(err.Error()))))
		return err
	}
	meta := json.RawMessage(fmt.Sprintf(`{"page_count":%d}`, pageCount))
	_ = s.docRepo.UpdateStatus(ctx, documentID, "indexed", meta)
	return nil
}

// EmbedChunks: calls Google text-embedding-004 for all chunks
func (s *KnowledgeServices) EmbedChunks(ctx context.Context, documentID string) error {
	chunks, err := s.chunkRepo.ListByDocument(ctx, documentID)
	if err != nil {
		return err
	}
	for _, c := range chunks {
		emb, err := s.embedText(ctx, c.Text)
		if err != nil {
			return err
		}
		if err := s.embRepo.UpsertForChunk(ctx, c.ID, emb); err != nil {
			return err
		}
	}
	return nil
}

func (s *KnowledgeServices) ListDocuments(ctx context.Context, workspaceID int64, limit, offset int) ([]KnowledgeDocumentItem, error) {
	docs, err := s.docRepo.ListByWorkspace(ctx, workspaceID, limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]KnowledgeDocumentItem, 0, len(docs))
	for _, d := range docs {
		out = append(out, KnowledgeDocumentItem{ID: d.ID, OriginalFilename: d.OriginalFilename, MimeType: d.MimeType, SizeBytes: d.SizeBytes, Status: d.Status, WorkspaceID: d.WorkspaceID})
	}
	return out, nil
}

func (s *KnowledgeServices) DeleteDocument(ctx context.Context, documentID string) error {
	return s.docRepo.Delete(ctx, documentID)
}

// UploadAndIndex: uploads raw bytes to Appwrite and then runs ParseAndChunk + EmbedChunks
func (s *KnowledgeServices) UploadAndIndex(ctx context.Context, userID int64, workspaceID int64, filename string, mime string, fileBytes []byte) (*KnowledgeDocumentResponse, error) {
	// 1) Upload file to Appwrite
	bucketID := ensureDefaultBucketID(s.appwrite)
	fileID, err := s.uploadToAppwrite(ctx, bucketID, filename, mime, fileBytes)
	if err != nil {
		return nil, err
	}
	// 2) Create document
	doc, err := s.BeginIngestion(ctx, userID, &BeginIngestionRequest{
		WorkspaceID:      workspaceID,
		AppwriteBucketID: bucketID,
		AppwriteFileID:   fileID,
		OriginalFilename: filename,
		MimeType:         mime,
		SizeBytes:        int64(len(fileBytes)),
	})
	if err != nil {
		return nil, err
	}
	// 3) Parse and chunk
	if err := s.ParseAndChunk(ctx, doc.ID); err != nil {
		return nil, err
	}
	// 4) Embed
	if err := s.EmbedChunks(ctx, doc.ID); err != nil {
		return nil, err
	}
	return doc, nil
}

// Simple content part structure from parser
type parsedPart struct {
	Text       string
	PageNumber int
}

func (s *KnowledgeServices) downloadFromAppwrite(ctx context.Context, bucketID, fileID string) ([]byte, error) {
	// GET /storage/buckets/{bucketId}/files/{fileId}/download
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/storage/buckets/%s/files/%s/download", s.appwrite.Endpoint, bucketID, fileID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Appwrite-Project", s.appwrite.ProjectID)
	req.Header.Set("X-Appwrite-Key", s.appwrite.APIKey)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("appwrite download failed: %d %s", resp.StatusCode, string(b))
	}
	return io.ReadAll(resp.Body)
}

func (s *KnowledgeServices) uploadToAppwrite(ctx context.Context, bucketID, filename, mime string, file []byte) (string, error) {
	// Appwrite multipart upload with required fileId param
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fid := uuid.New().String()
	if err := writer.WriteField("fileId", fid); err != nil {
		return "", err
	}
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(file); err != nil {
		return "", err
	}
	if err := writer.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/storage/buckets/%s/files", s.appwrite.Endpoint, bucketID), &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("X-Appwrite-Project", s.appwrite.ProjectID)
	req.Header.Set("X-Appwrite-Key", s.appwrite.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("appwrite upload failed: %d %s", resp.StatusCode, string(b))
	}
	var outMap map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&outMap)
	if v, ok := outMap["$id"].(string); ok && v != "" {
		return v, nil
	}
	if v, ok := outMap["fileId"].(string); ok && v != "" {
		return v, nil
	}
	if v, ok := outMap["id"].(string); ok && v != "" {
		return v, nil
	}
	return "", fmt.Errorf("could not resolve uploaded file id")
}

func ensureDefaultBucketID(app AppwriteConfig) string {
	// For now rely on env-provided bucket id via APPWRITE_BUCKET_ID; otherwise default to "knowledge"
	if v := os.Getenv("APPWRITE_BUCKET_ID"); v != "" {
		return v
	}
	return "knowledge"
}

func (s *KnowledgeServices) parseWithGeminiParser(ctx context.Context, file []byte, mime string) ([]parsedPart, int, error) {
	// Best-practice extraction and chunking inspired by LangChain's RecursiveCharacterTextSplitter
	switch mime {
	case "application/pdf":
		// Extract text per page using PDF parser
		parts, pages, err := extractPDFTextPerPage(file)
		if err != nil {
			return nil, 0, err
		}
		return parts, pages, nil
	case "text/plain", "text/markdown", "text/html":
		txt := string(file)
		if !isValidUTF8(txt) {
			txt = cleanNonUTF8(txt)
		}
		txt = normalizeWhitespace(txt)
		return []parsedPart{{Text: txt, PageNumber: 1}}, 1, nil
	default:
		// Fallback: treat as opaque text blob
		txt := string(file)
		if !isValidUTF8(txt) {
			txt = cleanNonUTF8(txt)
		}
		txt = normalizeWhitespace(txt)
		return []parsedPart{{Text: txt, PageNumber: 1}}, 1, nil
	}
}

// extractPDFTextPerPage returns a parsedPart per page with cleaned text
func extractPDFTextPerPage(content []byte) ([]parsedPart, int, error) {
	reader, err := pdf.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return nil, 0, err
	}
	numPages := reader.NumPage()
	parts := make([]parsedPart, 0, numPages)
	for i := 1; i <= numPages; i++ {
		p := reader.Page(i)
		if p.V.IsNull() {
			continue
		}
		s, err := p.GetPlainText(nil)
		if err != nil {
			return nil, 0, err
		}
		if !isValidUTF8(s) {
			s = cleanNonUTF8(s)
		}
		s = normalizeWhitespace(s)
		if strings.TrimSpace(s) == "" {
			continue
		}
		parts = append(parts, parsedPart{Text: s, PageNumber: i})
	}
	if len(parts) == 0 {
		return []parsedPart{{Text: "", PageNumber: 1}}, numPages, nil
	}
	return parts, numPages, nil
}

// isValidUTF8 checks if the string is valid UTF-8
func isValidUTF8(s string) bool {
	return utf8.ValidString(s)
}

// cleanNonUTF8 removes or replaces invalid UTF-8 sequences
func cleanNonUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}
	// Convert invalid UTF-8 sequences to valid ones
	v := make([]rune, 0, len(s))
	for i, r := range s {
		if r == utf8.RuneError {
			_, size := utf8.DecodeRuneInString(s[i:])
			if size == 1 {
				continue // Skip invalid bytes
			}
		}
		v = append(v, r)
	}
	return string(v)
}

func (s *KnowledgeServices) embedText(ctx context.Context, text string) ([]float32, error) {
	// Call Google text embedding API (text-embedding-004)
	// Single content embedding endpoint
	payload := map[string]any{
		"model": "models/text-embedding-004",
		"content": map[string]any{
			"parts": []map[string]any{{"text": text}},
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", s.aiCfg.GeminiAPIKey)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embedding failed: %d %s", resp.StatusCode, string(b))
	}
	var parsed struct {
		Embedding struct {
			Values []float32 `json:"values"`
		} `json:"embedding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if len(parsed.Embedding.Values) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return parsed.Embedding.Values, nil
}

func approxTokenCount(text string) int {
	// Roughly 4 chars per token heuristic
	n := len([]rune(text))
	if n <= 0 {
		return 0
	}
	t := n / 4
	if t < 1 {
		t = 1
	}
	return t
}

func escapeJSON(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\"", "\\\"")
	return s
}

// normalizeWhitespace collapses excessive whitespace and normalizes newlines
var (
	wsCollapseRE   = regexp.MustCompile(`[\t ]+`)
	multiNewlineRE = regexp.MustCompile(`\n{3,}`)
)

func normalizeWhitespace(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = wsCollapseRE.ReplaceAllString(s, " ")
	s = multiNewlineRE.ReplaceAllString(s, "\n\n")
	return strings.TrimSpace(s)
}

// Removed custom splitter in favor of langchaingo/textsplitter

// RAG service
type ragService struct {
	httpClient *http.Client
	logger     *slog.Logger
	aiCfg      *config.AIConfig
	embRepo    repository.KnowledgeEmbeddingRepository
}

func NewRAGService(aiCfg *config.AIConfig, embRepo repository.KnowledgeEmbeddingRepository, logger *slog.Logger) RAGService {
	return &ragService{
		httpClient: &http.Client{Timeout: 45 * time.Second},
		logger:     logger,
		aiCfg:      aiCfg,
		embRepo:    embRepo,
	}
}

func (s *ragService) Ask(ctx context.Context, req *RAGAskRequest) (*RAGAnswerResponse, error) {
	if req.TopK <= 0 {
		req.TopK = 6
	}
	if req.MaxContextTokens <= 0 {
		req.MaxContextTokens = 1500
	}
	qEmb, err := (&KnowledgeServices{httpClient: s.httpClient, aiCfg: s.aiCfg}).embedText(ctx, req.Query)
	if err != nil {
		return nil, err
	}
	chunks, err := s.embRepo.SimilarChunks(ctx, req.WorkspaceID, qEmb, req.TopK)
	if err != nil {
		return nil, err
	}
	// Build context
	var contextBuilder strings.Builder
	var sources []RAGSource
	tokens := 0
	for _, c := range chunks {
		if tokens+c.TokenCount > req.MaxContextTokens {
			break
		}
		contextBuilder.WriteString(c.Text)
		contextBuilder.WriteString("\n\n")
		tokens += c.TokenCount
		sources = append(sources, RAGSource{DocumentID: c.DocumentID, PageNumber: c.PageNumber, Excerpt: snippet(c.Text, 320)})
	}
	prompt := fmt.Sprintf("You are a research assistant. Use the provided CONTEXT to answer the QUESTION. Cite document ids and page numbers inline like [doc:ID p:PAGE] where relevant.\n\nCONTEXT:\n%s\n\nQUESTION: %s", contextBuilder.String(), req.Query)
	answer, err := s.answerWithGemini(ctx, prompt)
	if err != nil {
		return nil, err
	}
	return &RAGAnswerResponse{Answer: answer, Sources: sources}, nil
}

func (s *ragService) answerWithGemini(ctx context.Context, prompt string) (string, error) {
	payload := map[string]any{
		"contents": []map[string]any{{"role": "user", "parts": []map[string]any{{"text": prompt}}}},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", s.aiCfg.GeminiModel), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", s.aiCfg.GeminiAPIKey)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini answer failed: %d %s", resp.StatusCode, string(b))
	}
	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if len(parsed.Candidates) == 0 {
		return "", nil
	}
	var out strings.Builder
	for _, p := range parsed.Candidates[0].Content.Parts {
		if p.Text != "" {
			if out.Len() > 0 {
				out.WriteString("\n")
			}
			out.WriteString(p.Text)
		}
	}
	return out.String(), nil
}

func snippet(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
