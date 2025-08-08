package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	slog "log/slog"

	"strings"

	"github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type AISpec struct {
	Query   string          `json:"query" validate:"required,min=1"`
	Context json.RawMessage `json:"context,omitempty"`
	Format  string          `json:"format,omitempty"`
	PageID  string          `json:"page_id,omitempty"`
	UserID  int64           `json:"-"`
}

type AIResponse struct {
	Text    string          `json:"text"`
	Blocks  json.RawMessage `json:"blocks,omitempty"`
	Actions []AIAction      `json:"actions,omitempty"`
}

type AIService interface {
	GenerateContent(ctx context.Context, spec *AISpec) (*AIResponse, error)
}

type geminiService struct {
	httpClient *http.Client
	apiKey     string
	model      string
	pageSvc    PageService
	convRepo   repository.AIConversationRepository
	msgRepo    repository.AIMessageRepository
	logger     *slog.Logger
}

func NewAIService(cfg *config.AIConfig, pageSvc PageService, logger *slog.Logger) AIService {
	return &geminiService{
		httpClient: &http.Client{Timeout: 45 * time.Second},
		apiKey:     cfg.GeminiAPIKey,
		model:      cfg.GeminiModel,
		pageSvc:    pageSvc,
		logger:     logger,
	}
}

type geminiRequest struct {
	Contents          []geminiContent `json:"contents"`
	SystemInstruction *geminiContent  `json:"system_instruction,omitempty"`
	Tools             []geminiTool    `json:"tools,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text         string `json:"text,omitempty"`
	FunctionCall *struct {
		Name string                     `json:"name"`
		Args map[string]json.RawMessage `json:"args"`
	} `json:"functionCall,omitempty"`
	FunctionResponse *struct {
		Name     string      `json:"name"`
		Response interface{} `json:"response"`
	} `json:"functionResponse,omitempty"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFunctionDeclaration `json:"function_declarations"`
}

type geminiFunctionDeclaration struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type AIAction struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func (s *geminiService) GenerateContent(ctx context.Context, spec *AISpec) (*AIResponse, error) {
	system := "You are an assistant for a notes app. If a page is provided, you may propose EditorJS blocks via tools; otherwise, directly answer in clear, concise plain text or simple markdown. Avoid HTML."
	if spec.Format != "" {
		system += "\nFormatting hint: " + spec.Format
	}

	var tools []geminiTool
	if spec.PageID != "" {
		tools = []geminiTool{
			{
				FunctionDeclarations: []geminiFunctionDeclaration{
					{
						Name:        "insert_editorjs_blocks",
						Description: "Propose EditorJS blocks to insert into the current note. Use when the user asks to generate content.",
						Parameters: map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"blocks": map[string]interface{}{
									"type": "array",
									"items": map[string]interface{}{
										"type": "object",
										"properties": map[string]interface{}{
											"type": map[string]interface{}{"type": "string"},
											"data": map[string]interface{}{"type": "object"},
										},
										"required": []string{"type", "data"},
									},
								},
							},
							"required": []string{"blocks"},
						},
					},
				},
			},
		}
	}

	history := []geminiContent{{Role: "user", Parts: []geminiPart{{Text: spec.Query}}}}

	reqBody := geminiRequest{SystemInstruction: &geminiContent{Parts: []geminiPart{{Text: system}}}, Contents: history, Tools: tools}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal gemini request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", s.model)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", s.apiKey)

	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call gemini: %w", err)
	}
	defer httpResp.Body.Close()

	body, _ := io.ReadAll(httpResp.Body)
	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return nil, fmt.Errorf("gemini error: status=%d body=%s", httpResp.StatusCode, string(body))
	}

	var gResp geminiResponse
	if err := json.Unmarshal(body, &gResp); err != nil {
		return nil, fmt.Errorf("decode gemini: %w", err)
	}

	aiResp := &AIResponse{}

	if len(gResp.Candidates) > 0 {
		for _, p := range gResp.Candidates[0].Content.Parts {
			if p.FunctionCall != nil {
				// Surface tool calls to the client; do not execute server-side to minimize latency
				if p.FunctionCall.Name == "insert_editorjs_blocks" {
					payload, _ := json.Marshal(p.FunctionCall.Args)
					aiResp.Actions = append(aiResp.Actions, AIAction{Type: "insert_editorjs_blocks", Payload: payload})
				} else {
					payload, _ := json.Marshal(p.FunctionCall.Args)
					aiResp.Actions = append(aiResp.Actions, AIAction{Type: p.FunctionCall.Name, Payload: payload})
				}
				continue
			}
			if p.Text != "" {
				if aiResp.Text == "" {
					aiResp.Text = p.Text
				} else {
					aiResp.Text += "\n" + p.Text
				}
			}
		}
	}

	return aiResp, nil
}

func (s *geminiService) executeTool(ctx context.Context, spec *AISpec, name string, args map[string]json.RawMessage) (interface{}, error) {
	switch name {
	case "insert_editorjs_blocks":
		var payload struct {
			Blocks []map[string]interface{} `json:"blocks"`
		}
		if b, ok := args["blocks"]; ok {
			if err := json.Unmarshal(b, &payload.Blocks); err != nil {
				return nil, err
			}
		} else {
			return nil, fmt.Errorf("missing 'blocks' in args")
		}
		if spec.PageID == "" {
			return nil, fmt.Errorf("page_id is required")
		}

		page, err := s.pageSvc.GetPageWithBlocks(ctx, spec.UserID, spec.PageID)
		if err != nil {
			return nil, err
		}
		blocks := make([]map[string]interface{}, 0, len(page.Blocks)+len(payload.Blocks))
		for _, b := range page.Blocks {
			var data map[string]interface{}
			_ = json.Unmarshal(b.BlockData, &data)
			blocks = append(blocks, map[string]interface{}{"type": b.BlockType, "data": data})
		}
		normalized := make([]map[string]interface{}, 0, len(payload.Blocks))
		for _, blk := range payload.Blocks {
			tval, _ := blk["type"].(string)
			t := strings.ToLower(tval)
			data, _ := blk["data"].(map[string]interface{})
			switch t {
			case "heading", "header":
				normalized = append(normalized, map[string]interface{}{"type": "heading", "data": data})
			case "list", "ordered_list", "unordered_list":
				if _, ok := data["style"]; !ok {
					data["style"] = "unordered"
				}
				normalized = append(normalized, map[string]interface{}{"type": "list", "data": data})
			case "blockquote", "quote":
				normalized = append(normalized, map[string]interface{}{"type": "quote", "data": data})
			case "code", "codeblock":
				normalized = append(normalized, map[string]interface{}{"type": "code", "data": data})
			case "table":
				normalized = append(normalized, map[string]interface{}{"type": "table", "data": data})
			case "checklist":
				normalized = append(normalized, map[string]interface{}{"type": "checklist", "data": data})
			case "divider", "hr":
				normalized = append(normalized, map[string]interface{}{"type": "divider", "data": map[string]interface{}{"type": "line"}})
			case "image":
				normalized = append(normalized, map[string]interface{}{"type": "image", "data": data})
			default:
				normalized = append(normalized, map[string]interface{}{"type": "paragraph", "data": data})
			}
		}
		blocks = append(blocks, normalized...)
		editorJS := map[string]interface{}{"time": time.Now().UnixMilli(), "blocks": blocks, "version": "2.28.2"}
		content, _ := json.Marshal(editorJS)
		_, err = s.pageSvc.SavePageContent(ctx, spec.UserID, spec.PageID, &SavePageContentRequest{Content: content})
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{"ok": true, "inserted": len(payload.Blocks)}, nil
	case "get_current_note":
		if spec.PageID == "" {
			return nil, fmt.Errorf("page_id is required")
		}
		page, err := s.pageSvc.GetPageWithBlocks(ctx, spec.UserID, spec.PageID)
		if err != nil {
			return nil, err
		}
		blocks := make([]map[string]interface{}, 0, len(page.Blocks))
		for _, b := range page.Blocks {
			var data map[string]interface{}
			_ = json.Unmarshal(b.BlockData, &data)
			blocks = append(blocks, map[string]interface{}{"type": b.BlockType, "data": data})
		}
		return map[string]interface{}{"title": page.Title, "blocks": blocks}, nil
	default:
		return nil, fmt.Errorf("unknown tool: %s", name)
	}
}
