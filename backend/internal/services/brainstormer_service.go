package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type brainstormerService struct {
	httpClient *http.Client
	aiCfg      *config.AIConfig

	docRepo   repository.KnowledgeDocumentRepository
	chunkRepo repository.KnowledgeChunkRepository
	embRepo   repository.KnowledgeEmbeddingRepository
}

func NewBrainstormerService(aiCfg *config.AIConfig,
	docRepo repository.KnowledgeDocumentRepository,
	chunkRepo repository.KnowledgeChunkRepository,
	embRepo repository.KnowledgeEmbeddingRepository,
) BrainstormerService {
	return &brainstormerService{
		httpClient: &http.Client{Timeout: 60 * time.Second},
		aiCfg:      aiCfg,
		docRepo:    docRepo,
		chunkRepo:  chunkRepo,
		embRepo:    embRepo,
	}
}

func (s *brainstormerService) GenerateFlashcards(ctx context.Context, req *BrainstormerGenerateRequest) (*FlashcardsResponse, error) {
	if req.NumItems <= 0 {
		req.NumItems = 12
	}
	contextText, sources, err := s.collectContext(ctx, req)
	if err != nil {
		return nil, err
	}
	prompt := s.buildFlashcardPrompt(contextText, req)
	var out struct {
		Items []FlashcardItem `json:"items"`
	}
	if err := s.generateJSON(ctx, prompt, &out); err != nil {
		return nil, err
	}
	// Attach best-effort sources if model omitted them
	attachSourcesIfMissing(out.Items, sources)
	return &FlashcardsResponse{Items: out.Items}, nil
}

func (s *brainstormerService) GenerateMCQs(ctx context.Context, req *BrainstormerGenerateRequest) (*MCQsResponse, error) {
	if req.NumItems <= 0 {
		req.NumItems = 10
	}
	contextText, sources, err := s.collectContext(ctx, req)
	if err != nil {
		return nil, err
	}
	prompt := s.buildMCQPrompt(contextText, req)
	var out struct {
		Items []MCQItem `json:"items"`
	}
	if err := s.generateJSON(ctx, prompt, &out); err != nil {
		return nil, err
	}
	attachMCQSourcesIfMissing(out.Items, sources)
	return &MCQsResponse{Items: out.Items}, nil
}

func (s *brainstormerService) GenerateCloze(ctx context.Context, req *BrainstormerGenerateRequest) (*ClozeResponse, error) {
	if req.NumItems <= 0 {
		req.NumItems = 10
	}
	contextText, sources, err := s.collectContext(ctx, req)
	if err != nil {
		return nil, err
	}
	prompt := s.buildClozePrompt(contextText, req)
	var out struct {
		Items []ClozeItem `json:"items"`
	}
	if err := s.generateJSON(ctx, prompt, &out); err != nil {
		return nil, err
	}
	attachClozeSourcesIfMissing(out.Items, sources)
	return &ClozeResponse{Items: out.Items}, nil
}

// collectContext gathers normalized text from selected documents or from the entire workspace if none specified.
// It returns a concatenated context string and a slice of source hints to be attached to items.
func (s *brainstormerService) collectContext(ctx context.Context, req *BrainstormerGenerateRequest) (string, []SourceHint, error) {
	var contexts []string
	var hints []SourceHint

	maxTokens := req.MaxContextTokens
	if maxTokens <= 0 {
		maxTokens = 1600
	}
	tokens := 0

	// If document IDs are provided, use their chunks directly in order of chunk_index
	if len(req.DocumentIDs) > 0 {
		// Keep a deterministic order
		ids := append([]string(nil), req.DocumentIDs...)
		sort.Strings(ids)
		for _, docID := range ids {
			chunks, err := s.chunkRepo.ListByDocument(ctx, docID)
			if err != nil {
				return "", nil, err
			}
			for _, c := range chunks {
				if tokens+c.TokenCount > maxTokens {
					break
				}
				contexts = append(contexts, strings.TrimSpace(c.Text))
				tokens += c.TokenCount
				hints = append(hints, SourceHint{DocumentID: c.DocumentID, PageNumber: c.PageNumber})
				if tokens >= maxTokens {
					break
				}
			}
			if tokens >= maxTokens {
				break
			}
		}
		return strings.Join(contexts, "\n\n"), hints, nil
	}

	// Otherwise, build a generic query to retrieve diverse chunks across the workspace
	// Use embedding-based retrieval with a broad query to cover key concepts
	query := "key concepts, definitions, facts, important formulas and relationships from the study materials"
	qEmb, err := (&KnowledgeServices{httpClient: s.httpClient, aiCfg: s.aiCfg}).embedText(ctx, query)
	if err != nil {
		return "", nil, err
	}
	// Retrieve more than needed and then trim by tokens
	similar, err := s.embRepo.SimilarChunks(ctx, req.WorkspaceID, qEmb, 32)
	if err != nil {
		return "", nil, err
	}
	for _, c := range similar {
		if tokens+c.TokenCount > maxTokens {
			break
		}
		contexts = append(contexts, strings.TrimSpace(c.Text))
		tokens += c.TokenCount
		hints = append(hints, SourceHint{DocumentID: c.DocumentID, PageNumber: c.PageNumber})
	}
	return strings.Join(contexts, "\n\n"), hints, nil
}

func (s *brainstormerService) buildFlashcardPrompt(context string, req *BrainstormerGenerateRequest) string {
	var b strings.Builder
	b.WriteString("You are an expert educator. From the provided CONTEXT, create high-quality study flashcards.\n")
	if len(req.Topics) > 0 {
		b.WriteString("Focus topics: ")
		b.WriteString(strings.Join(req.Topics, ", "))
		b.WriteString(".\n")
	}
	if req.Difficulty != "" {
		b.WriteString("Target difficulty: ")
		b.WriteString(req.Difficulty)
		b.WriteString(".\n")
	}
	fmt.Fprintf(&b, "Generate exactly %d items.\n", req.NumItems)
	b.WriteString("Return ONLY JSON with this schema: {\"items\":[{\"question\":string,\"answer\":string,\"source_document_id\":string|null,\"source_page_number\":number|null}]}.\n")
	b.WriteString("Each question must be clear and atomic; answers concise and correct.\n")
	b.WriteString("CONTEXT:\n")
	b.WriteString(context)
	return b.String()
}

func (s *brainstormerService) buildMCQPrompt(context string, req *BrainstormerGenerateRequest) string {
	var b strings.Builder
	b.WriteString("You are generating exam-quality multiple-choice questions from CONTEXT.\n")
	if len(req.Topics) > 0 {
		b.WriteString("Focus topics: ")
		b.WriteString(strings.Join(req.Topics, ", "))
		b.WriteString(".\n")
	}
	if req.Difficulty != "" {
		b.WriteString("Target difficulty: ")
		b.WriteString(req.Difficulty)
		b.WriteString(".\n")
	}
	fmt.Fprintf(&b, "Generate exactly %d items with 4 options each.\n", req.NumItems)
	b.WriteString("Return ONLY JSON with schema: {\"items\":[{\"question\":string,\"options\":[string,string,string,string],\"correct_index\":number,\"explanation\":string,\"source_document_id\":string|null,\"source_page_number\":number|null}]}.\n")
	b.WriteString("Options must be plausible, mutually exclusive, and not trivial. Provide a short explanation for the correct answer.\n")
	b.WriteString("CONTEXT:\n")
	b.WriteString(context)
	return b.String()
}

func (s *brainstormerService) buildClozePrompt(context string, req *BrainstormerGenerateRequest) string {
	var b strings.Builder
	b.WriteString("Create cloze deletion (fill-in-the-blank) items from CONTEXT focusing on key terms and formulas.\n")
	if len(req.Topics) > 0 {
		b.WriteString("Focus topics: ")
		b.WriteString(strings.Join(req.Topics, ", "))
		b.WriteString(".\n")
	}
	if req.Difficulty != "" {
		b.WriteString("Target difficulty: ")
		b.WriteString(req.Difficulty)
		b.WriteString(".\n")
	}
	fmt.Fprintf(&b, "Generate exactly %d items.\n", req.NumItems)
	b.WriteString("Return ONLY JSON with schema: {\"items\":[{\"text\":string,\"answer\":string,\"explanation\":string,\"source_document_id\":string|null,\"source_page_number\":number|null}]}.\n")
	b.WriteString("In 'text', replace the answer with '____' once. Ensure 'answer' is the exact missing term/phrase.\n")
	b.WriteString("CONTEXT:\n")
	b.WriteString(context)
	return b.String()
}

// generateJSON calls Gemini and enforces application/json output using generationConfig
func (s *brainstormerService) generateJSON(ctx context.Context, prompt string, out any) error {
	reqBody := map[string]any{
		"contents": []map[string]any{
			{"role": "user", "parts": []map[string]any{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
		},
		// Hint schema via system instruction to improve reliability in prod
		"systemInstruction": map[string]any{
			"role":  "system",
			"parts": []map[string]any{{"text": "Always respond with strictly valid JSON that matches the requested schema. Do not include any commentary, code fences, or additional text."}},
		},
	}
	body, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", s.aiCfg.GeminiModel)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", s.aiCfg.GeminiAPIKey)
	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("gemini generate failed: %d %s", resp.StatusCode, string(b))
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
		return err
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return fmt.Errorf("no candidates returned")
	}
	raw := parsed.Candidates[0].Content.Parts[0].Text
	// Some models may wrap JSON in triple backticks. Strip common fences.
	raw = strings.TrimSpace(raw)
	raw = strings.Trim(raw, "`")
	// Attempt to unmarshal
	if err := json.Unmarshal([]byte(raw), out); err != nil {
		// Last resort: find first and last braces
		start := strings.IndexAny(raw, "{")
		end := strings.LastIndexAny(raw, "}")
		if start >= 0 && end > start {
			if err2 := json.Unmarshal([]byte(raw[start:end+1]), out); err2 == nil {
				return nil
			}
		}
		return fmt.Errorf("failed to decode model JSON: %w", err)
	}
	return nil
}

// Helpers
type SourceHint struct {
	DocumentID string
	PageNumber *int
}

func attachSourcesIfMissing(items []FlashcardItem, hints []SourceHint) {
	if len(items) == 0 || len(hints) == 0 {
		return
	}
	for i := range items {
		if items[i].SourceDocumentID == nil && i < len(hints) {
			items[i].SourceDocumentID = &hints[i%len(hints)].DocumentID
		}
		if items[i].SourcePageNumber == nil && i < len(hints) {
			items[i].SourcePageNumber = hints[i%len(hints)].PageNumber
		}
	}
}

func attachMCQSourcesIfMissing(items []MCQItem, hints []SourceHint) {
	if len(items) == 0 || len(hints) == 0 {
		return
	}
	for i := range items {
		if items[i].SourceDocumentID == nil && i < len(hints) {
			items[i].SourceDocumentID = &hints[i%len(hints)].DocumentID
		}
		if items[i].SourcePageNumber == nil && i < len(hints) {
			items[i].SourcePageNumber = hints[i%len(hints)].PageNumber
		}
	}
}

func attachClozeSourcesIfMissing(items []ClozeItem, hints []SourceHint) {
	if len(items) == 0 || len(hints) == 0 {
		return
	}
	for i := range items {
		if items[i].SourceDocumentID == nil && i < len(hints) {
			items[i].SourceDocumentID = &hints[i%len(hints)].DocumentID
		}
		if items[i].SourcePageNumber == nil && i < len(hints) {
			items[i].SourcePageNumber = hints[i%len(hints)].PageNumber
		}
	}
}
