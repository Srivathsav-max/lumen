package services

import (
	"encoding/json"
	"time"
)

type RegisterRequest struct {
	Username  string `json:"username" validate:"required,min=3,max=50,alphanum"`
	Email     string `json:"email" validate:"required,email,max=255"`
	Password  string `json:"password" validate:"required,min=8,max=128"`
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UpdateProfileRequest struct {
	Username  *string `json:"username" validate:"omitempty,min=3,max=50,alphanum"`
	Email     *string `json:"email" validate:"omitempty,email,max=255"`
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name" validate:"omitempty,max=100"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

type UserResponse struct {
	ID            int64     `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	EmailVerified bool      `json:"email_verified"`
	Roles         []string  `json:"roles"`
	IsAdmin       bool      `json:"is_admin"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type RoleResponse struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type WaitlistRequest struct {
	Email     string `json:"email" validate:"required,email,max=255"`
	FirstName string `json:"first_name" validate:"omitempty,max=100"`
	LastName  string `json:"last_name" validate:"omitempty,max=100"`
	Reason    string `json:"reason" validate:"omitempty,max=500"`
}

type WaitlistPositionResponse struct {
	Email     string    `json:"email"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

type GetWaitlistRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	PageSize int    `json:"page_size" validate:"min=1,max=100"`
	Status   string `json:"status" validate:"omitempty,oneof=pending approved rejected"`
	Search   string `json:"search" validate:"omitempty,max=255"`
}

type WaitlistListResponse struct {
	Entries    []WaitlistEntryResponse `json:"entries"`
	Total      int64                   `json:"total"`
	Page       int                     `json:"page"`
	PageSize   int                     `json:"page_size"`
	TotalPages int                     `json:"total_pages"`
}

type WaitlistEntryResponse struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SetSettingRequest struct {
	Key   string      `json:"key" validate:"required,max=255"`
	Value interface{} `json:"value" validate:"required"`
}

type SettingResponse struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	UpdatedAt time.Time   `json:"updated_at"`
}

type PaginationRequest struct {
	Page     int `json:"page" validate:"min=1"`
	PageSize int `json:"page_size" validate:"min=1,max=100"`
}

type PaginationResponse struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

type ValidationErrorResponse struct {
	Message string                  `json:"message"`
	Errors  []ValidationErrorDetail `json:"errors"`
}

type HealthCheckResponse struct {
	Status    string                   `json:"status"`
	Timestamp time.Time                `json:"timestamp"`
	Services  map[string]ServiceHealth `json:"services"`
	Version   string                   `json:"version"`
}

type ServiceHealth struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}

// Notes System DTOs

type CreateWorkspaceRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
}

type UpdateWorkspaceRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
}

type WorkspaceResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	OwnerID     int64     `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	MemberCount int       `json:"member_count"`
	Role        string    `json:"role"` // Current user's role
}

type AddWorkspaceMemberRequest struct {
	UserID int64  `json:"user_id" validate:"required"`
	Role   string `json:"role" validate:"required,oneof=member admin"`
}

type WorkspaceMemberResponse struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Role        string    `json:"role"`
	AddedBy     int64     `json:"added_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreatePageRequest struct {
	Title       string          `json:"title,omitempty" validate:"omitempty,max=500"`
	WorkspaceID int64           `json:"workspace_id" validate:"required"`
	ParentID    *string         `json:"parent_id,omitempty"`
	Icon        *string         `json:"icon,omitempty"`
	CoverURL    *string         `json:"cover_url,omitempty"`
	IsTemplate  bool            `json:"is_template"`
	Properties  json.RawMessage `json:"properties,omitempty"`
}

type UpdatePageRequest struct {
	Title      *string         `json:"title,omitempty" validate:"omitempty,max=500"`
	Icon       *string         `json:"icon,omitempty"`
	CoverURL   *string         `json:"cover_url,omitempty"`
	IsTemplate *bool           `json:"is_template,omitempty"`
	Properties json.RawMessage `json:"properties,omitempty"`
}

type PageResponse struct {
	ID           string          `json:"id"`
	Title        string          `json:"title"`
	WorkspaceID  int64           `json:"workspace_id"`
	OwnerID      int64           `json:"owner_id"`
	ParentID     *string         `json:"parent_id,omitempty"`
	Icon         *string         `json:"icon,omitempty"`
	CoverURL     *string         `json:"cover_url,omitempty"`
	IsArchived   bool            `json:"is_archived"`
	IsTemplate   bool            `json:"is_template"`
	Properties   json.RawMessage `json:"properties"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	LastEditedBy *int64          `json:"last_edited_by,omitempty"`
	Permission   string          `json:"permission"` // Current user's permission level
	ChildrenCount int            `json:"children_count"`
	Blocks       []BlockResponse `json:"blocks,omitempty"`
}

type CreateBlockRequest struct {
	PageID        string          `json:"page_id" validate:"required"`
	BlockType     string          `json:"block_type" validate:"required"`
	BlockData     json.RawMessage `json:"block_data" validate:"required"`
	Position      int             `json:"position"`
	ParentBlockID *string         `json:"parent_block_id,omitempty"`
}

type UpdateBlockRequest struct {
	BlockType     *string         `json:"block_type,omitempty"`
	BlockData     json.RawMessage `json:"block_data,omitempty"`
	Position      *int            `json:"position,omitempty"`
	ParentBlockID *string         `json:"parent_block_id,omitempty"`
}

type BlockResponse struct {
	ID            string          `json:"id"`
	PageID        string          `json:"page_id"`
	BlockType     string          `json:"block_type"`
	BlockData     json.RawMessage `json:"block_data"`
	Position      int             `json:"position"`
	ParentBlockID *string         `json:"parent_block_id,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	CreatedBy     int64           `json:"created_by"`
	LastEditedBy  *int64          `json:"last_edited_by,omitempty"`
}

type BulkBlockOperation struct {
	Operation string          `json:"operation" validate:"required,oneof=create update delete"`
	BlockID   *string         `json:"block_id,omitempty"`
	Block     *CreateBlockRequest `json:"block,omitempty"`
	Updates   *UpdateBlockRequest `json:"updates,omitempty"`
}

type BulkBlockRequest struct {
	Operations []BulkBlockOperation `json:"operations" validate:"required,dive"`
}

type ReorderBlocksRequest struct {
	BlockOrders map[string]int `json:"block_orders" validate:"required"`
}

type SavePageContentRequest struct {
	Title   *string         `json:"title,omitempty"`
	Content json.RawMessage `json:"content" validate:"required"` // EditorJS format
}

type CreateCommentRequest struct {
	PageID          string  `json:"page_id" validate:"required"`
	BlockID         *string `json:"block_id,omitempty"`
	ParentCommentID *string `json:"parent_comment_id,omitempty"`
	Content         string  `json:"content" validate:"required,min=1,max=2000"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

type CommentResponse struct {
	ID              string     `json:"id"`
	PageID          string     `json:"page_id"`
	BlockID         *string    `json:"block_id,omitempty"`
	ParentCommentID *string    `json:"parent_comment_id,omitempty"`
	AuthorID        int64      `json:"author_id"`
	AuthorName      string     `json:"author_name"`
	AuthorEmail     string     `json:"author_email"`
	Content         string     `json:"content"`
	IsResolved      bool       `json:"is_resolved"`
	ResolvedBy      *int64     `json:"resolved_by,omitempty"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	Replies         []CommentResponse `json:"replies,omitempty"`
}

type GrantPagePermissionRequest struct {
	UserID     int64  `json:"user_id" validate:"required"`
	Permission string `json:"permission" validate:"required,oneof=view comment edit admin"`
}

type PagePermissionResponse struct {
	ID         int64     `json:"id"`
	PageID     string    `json:"page_id"`
	UserID     int64     `json:"user_id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	Permission string    `json:"permission"`
	GrantedBy  int64     `json:"granted_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type PageVersionResponse struct {
	ID            string          `json:"id"`
	PageID        string          `json:"page_id"`
	VersionNumber int             `json:"version_number"`
	Title         *string         `json:"title,omitempty"`
	Content       json.RawMessage `json:"content"`
	ChangeSummary *string         `json:"change_summary,omitempty"`
	CreatedBy     int64           `json:"created_by"`
	CreatedAt     time.Time       `json:"created_at"`
}

type SearchPagesRequest struct {
	WorkspaceID int64  `json:"workspace_id" validate:"required"`
	Query       string `json:"query" validate:"required,min=1"`
	Limit       int    `json:"limit" validate:"min=1,max=100"`
	Offset      int    `json:"offset" validate:"min=0"`
}

type SearchPagesResponse struct {
	Pages  []PageResponse `json:"pages"`
	Total  int64          `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}
