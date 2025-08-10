package repository

import (
	"context"
	"encoding/json"
	"time"
)

type User struct {
	ID            int64     `db:"id" json:"id"`
	Username      string    `db:"username" json:"username"`
	Email         string    `db:"email" json:"email"`
	PasswordHash  string    `db:"password_hash" json:"-"`
	FirstName     string    `db:"first_name" json:"first_name"`
	LastName      string    `db:"last_name" json:"last_name"`
	EmailVerified bool      `db:"email_verified" json:"email_verified"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

type Role struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type Token struct {
	ID         int64     `db:"id" json:"id"`
	UserID     int64     `db:"user_id" json:"user_id"`
	Token      string    `db:"refresh_token" json:"refresh_token"`
	DeviceInfo string    `db:"device_info" json:"device_info"`
	ExpiresAt  time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time `db:"updated_at" json:"updated_at"`
}

type VerificationToken struct {
	ID        int64     `db:"id" json:"id"`
	UserID    int64     `db:"user_id" json:"user_id"`
	Token     string    `db:"token" json:"token"`
	TokenType string    `db:"token_type" json:"token_type"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	IsUsed    bool      `db:"is_used" json:"is_used"`
}

type WaitlistEntry struct {
	ID        int64     `db:"id" json:"id"`
	Email     string    `db:"email" json:"email"`
	FirstName string    `db:"first_name" json:"first_name"`
	LastName  string    `db:"last_name" json:"last_name"`
	Reason    string    `db:"reason" json:"reason"`
	Status    string    `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type SystemSetting struct {
	Key         string    `db:"key" json:"key"`
	Value       string    `db:"value" json:"value"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id int64) error
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	List(ctx context.Context, limit, offset int) ([]*User, error)
	Count(ctx context.Context) (int64, error)
}

type RoleRepository interface {
	Create(ctx context.Context, role *Role) error
	GetByID(ctx context.Context, id int64) (*Role, error)
	GetByName(ctx context.Context, name string) (*Role, error)
	Update(ctx context.Context, role *Role) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context) ([]*Role, error)
	AssignRoleToUser(ctx context.Context, userID, roleID int64) error
	RemoveRoleFromUser(ctx context.Context, userID, roleID int64) error
	GetUserRoles(ctx context.Context, userID int64) ([]*Role, error)
	HasRole(ctx context.Context, userID int64, roleName string) (bool, error)
}

type TokenRepository interface {
	Create(ctx context.Context, token *Token) error
	GetByToken(ctx context.Context, tokenString string) (*Token, error)
	GetByUserID(ctx context.Context, userID int64, tokenType string) ([]*Token, error)
	Update(ctx context.Context, token *Token) error
	Delete(ctx context.Context, id int64) error
	RevokeToken(ctx context.Context, tokenString string) error
	RevokeAllUserTokens(ctx context.Context, userID int64, tokenType string) error
	CleanupExpiredTokens(ctx context.Context) error
	StoreRefreshToken(ctx context.Context, userID int64, token string, expiresAt time.Time) error
	ValidateRefreshToken(ctx context.Context, token string) (int64, error)
	RevokeRefreshToken(ctx context.Context, token string) error
}

type VerificationTokenRepository interface {
	Create(ctx context.Context, token interface{}) error
	GetByToken(ctx context.Context, tokenString, tokenType string) (interface{}, error)
	GetByUserID(ctx context.Context, userID int64, tokenType string) (interface{}, error)
	Update(ctx context.Context, token interface{}) error
	Delete(ctx context.Context, id int64) error
	MarkAsUsed(ctx context.Context, tokenID int64) error
	DeleteExpiredTokens(ctx context.Context) error
	DeleteUserTokensByType(ctx context.Context, userID int64, tokenType string) error
}

type WaitlistRepository interface {
	Create(ctx context.Context, waitlist *WaitlistEntry) error
	GetByID(ctx context.Context, id int64) (*WaitlistEntry, error)
	GetByEmail(ctx context.Context, email string) (*WaitlistEntry, error)
	Update(ctx context.Context, waitlist *WaitlistEntry) error
	Delete(ctx context.Context, id int64) error
	DeleteByEmail(ctx context.Context, email string) error
	List(ctx context.Context, limit, offset int) ([]*WaitlistEntry, error)
	GetPaginated(ctx context.Context, limit, offset int, status, search string) ([]*WaitlistEntry, error)
	GetTotalCount(ctx context.Context, status, search string) (int64, error)
	GetPositionByEmail(ctx context.Context, email string) (int, error)
	Count(ctx context.Context) (int64, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
}

type SystemSettingsRepository interface {
	Create(ctx context.Context, setting *SystemSetting) error
	GetByKey(ctx context.Context, key string) (*SystemSetting, error)
	GetAll(ctx context.Context) ([]*SystemSetting, error)
	Update(ctx context.Context, setting *SystemSetting) error
	Delete(ctx context.Context, key string) error
	List(ctx context.Context) ([]*SystemSetting, error)
	GetValue(ctx context.Context, key string) (string, error)
	SetValue(ctx context.Context, key, value string) error
}

// Notes System Models

type Workspace struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description *string   `db:"description" json:"description,omitempty"`
	OwnerID     int64     `db:"owner_id" json:"owner_id"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type WorkspaceRole string

const (
	WorkspaceRoleMember WorkspaceRole = "member"
	WorkspaceRoleAdmin  WorkspaceRole = "admin"
	WorkspaceRoleOwner  WorkspaceRole = "owner"
)

type WorkspaceMember struct {
	ID          int64         `db:"id" json:"id"`
	WorkspaceID int64         `db:"workspace_id" json:"workspace_id"`
	UserID      int64         `db:"user_id" json:"user_id"`
	Role        WorkspaceRole `db:"role" json:"role"`
	AddedBy     int64         `db:"added_by" json:"added_by"`
	CreatedAt   time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `db:"updated_at" json:"updated_at"`
}

type Page struct {
	ID           string          `db:"id" json:"id"`
	Title        string          `db:"title" json:"title"`
	WorkspaceID  int64           `db:"workspace_id" json:"workspace_id"`
	OwnerID      int64           `db:"owner_id" json:"owner_id"`
	ParentID     *string         `db:"parent_id" json:"parent_id,omitempty"`
	Icon         *string         `db:"icon" json:"icon,omitempty"`
	CoverURL     *string         `db:"cover_url" json:"cover_url,omitempty"`
	IsArchived   bool            `db:"is_archived" json:"is_archived"`
	IsTemplate   bool            `db:"is_template" json:"is_template"`
	Properties   json.RawMessage `db:"properties" json:"properties"`
	CreatedAt    time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time       `db:"updated_at" json:"updated_at"`
	LastEditedBy *int64          `db:"last_edited_by" json:"last_edited_by,omitempty"`
}

type Block struct {
	ID            string          `db:"id" json:"id"`
	PageID        string          `db:"page_id" json:"page_id"`
	BlockType     string          `db:"block_type" json:"block_type"`
	BlockData     json.RawMessage `db:"block_data" json:"block_data"`
	Position      int             `db:"position" json:"position"`
	ParentBlockID *string         `db:"parent_block_id" json:"parent_block_id,omitempty"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time       `db:"updated_at" json:"updated_at"`
	CreatedBy     int64           `db:"created_by" json:"created_by"`
	LastEditedBy  *int64          `db:"last_edited_by" json:"last_edited_by,omitempty"`
}

// Knowledge ingestion and retrieval models
type KnowledgeDocument struct {
	ID               string          `db:"id" json:"id"`
	UserID           int64           `db:"user_id" json:"user_id"`
	WorkspaceID      int64           `db:"workspace_id" json:"workspace_id"`
	PageID           *string         `db:"page_id" json:"page_id,omitempty"`
	Context          string          `db:"context" json:"context"`
	AppwriteBucketID string          `db:"appwrite_bucket_id" json:"appwrite_bucket_id"`
	AppwriteFileID   string          `db:"appwrite_file_id" json:"appwrite_file_id"`
	OriginalFilename string          `db:"original_filename" json:"original_filename"`
	MimeType         string          `db:"mime_type" json:"mime_type"`
	SizeBytes        int64           `db:"size_bytes" json:"size_bytes"`
	Status           string          `db:"status" json:"status"`
	PageCount        *int            `db:"page_count" json:"page_count,omitempty"`
	Metadata         json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt        time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time       `db:"updated_at" json:"updated_at"`
}

type KnowledgeChunk struct {
	ID         string    `db:"id" json:"id"`
	DocumentID string    `db:"document_id" json:"document_id"`
	ChunkIndex int       `db:"chunk_index" json:"chunk_index"`
	Text       string    `db:"text" json:"text"`
	PageNumber *int      `db:"page_number" json:"page_number,omitempty"`
	StartChar  *int      `db:"start_char" json:"start_char,omitempty"`
	EndChar    *int      `db:"end_char" json:"end_char,omitempty"`
	TokenCount int       `db:"token_count" json:"token_count"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type KnowledgeEmbedding struct {
	ChunkID string `db:"chunk_id" json:"chunk_id"`
}

type KnowledgeDocumentRepository interface {
	Create(ctx context.Context, d *KnowledgeDocument) error
	UpdateStatus(ctx context.Context, id string, status string, metadata json.RawMessage) error
	GetByID(ctx context.Context, id string) (*KnowledgeDocument, error)
	ListByWorkspace(ctx context.Context, workspaceID int64, limit, offset int) ([]*KnowledgeDocument, error)
	ListByWorkspaceAndPage(ctx context.Context, workspaceID int64, pageID *string, limit, offset int) ([]*KnowledgeDocument, error)
	ListByWorkspaceAndContext(ctx context.Context, workspaceID int64, context string, limit, offset int) ([]*KnowledgeDocument, error)
	Delete(ctx context.Context, id string) error
}

type KnowledgeChunkRepository interface {
	CreateBulk(ctx context.Context, chunks []*KnowledgeChunk) error
	ListByDocument(ctx context.Context, documentID string) ([]*KnowledgeChunk, error)
	DeleteByDocument(ctx context.Context, documentID string) error
}

type KnowledgeEmbeddingRepository interface {
	UpsertForChunk(ctx context.Context, chunkID string, embedding []float32) error
	SimilarChunks(ctx context.Context, workspaceID int64, queryEmbedding []float32, limit int) ([]*KnowledgeChunk, error)
}

type PermissionLevel string

const (
	PermissionView    PermissionLevel = "view"
	PermissionComment PermissionLevel = "comment"
	PermissionEdit    PermissionLevel = "edit"
	PermissionAdmin   PermissionLevel = "admin"
)

type PagePermission struct {
	ID         int64           `db:"id" json:"id"`
	PageID     string          `db:"page_id" json:"page_id"`
	UserID     int64           `db:"user_id" json:"user_id"`
	Permission PermissionLevel `db:"permission" json:"permission"`
	GrantedBy  int64           `db:"granted_by" json:"granted_by"`
	CreatedAt  time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time       `db:"updated_at" json:"updated_at"`
}

type PageVersion struct {
	ID            string          `db:"id" json:"id"`
	PageID        string          `db:"page_id" json:"page_id"`
	VersionNumber int             `db:"version_number" json:"version_number"`
	Title         *string         `db:"title" json:"title,omitempty"`
	Content       json.RawMessage `db:"content" json:"content"`
	ChangeSummary *string         `db:"change_summary" json:"change_summary,omitempty"`
	CreatedBy     int64           `db:"created_by" json:"created_by"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}

type Comment struct {
	ID              string     `db:"id" json:"id"`
	PageID          string     `db:"page_id" json:"page_id"`
	BlockID         *string    `db:"block_id" json:"block_id,omitempty"`
	ParentCommentID *string    `db:"parent_comment_id" json:"parent_comment_id,omitempty"`
	AuthorID        int64      `db:"author_id" json:"author_id"`
	Content         string     `db:"content" json:"content"`
	IsResolved      bool       `db:"is_resolved" json:"is_resolved"`
	ResolvedBy      *int64     `db:"resolved_by" json:"resolved_by,omitempty"`
	ResolvedAt      *time.Time `db:"resolved_at" json:"resolved_at,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

// AI Chat models
type AIConversation struct {
	ID        string    `db:"id" json:"id"`
	UserID    int64     `db:"user_id" json:"user_id"`
	Type      string    `db:"type" json:"type"`
	PageID    *string   `db:"page_id" json:"page_id,omitempty"`
	Title     *string   `db:"title" json:"title,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type AIMessage struct {
	ID             string          `db:"id" json:"id"`
	ConversationID string          `db:"conversation_id" json:"conversation_id"`
	Role           string          `db:"role" json:"role"`
	Content        string          `db:"content" json:"content"`
	Metadata       json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt      time.Time       `db:"created_at" json:"created_at"`
}

type AIConversationRepository interface {
	UpsertConversation(ctx context.Context, userID int64, chatType string, pageID *string, title *string) (*AIConversation, error)
	GetConversation(ctx context.Context, userID int64, chatType string, pageID *string) (*AIConversation, error)
}

type AIMessageRepository interface {
	CreateMessage(ctx context.Context, msg *AIMessage) error
	ListMessages(ctx context.Context, conversationID string, limit, offset int) ([]*AIMessage, error)
}

// Repository Interfaces for Notes System

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *Workspace) error
	GetByID(ctx context.Context, id int64) (*Workspace, error)
	GetByOwnerID(ctx context.Context, ownerID int64) ([]*Workspace, error)
	Update(ctx context.Context, workspace *Workspace) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, limit, offset int) ([]*Workspace, error)
	GetUserWorkspaces(ctx context.Context, userID int64) ([]*Workspace, error)
	AddMember(ctx context.Context, member *WorkspaceMember) error
	RemoveMember(ctx context.Context, workspaceID, userID int64) error
	GetMembers(ctx context.Context, workspaceID int64) ([]*WorkspaceMember, error)
	UpdateMemberRole(ctx context.Context, workspaceID, userID int64, role WorkspaceRole) error
	HasAccess(ctx context.Context, workspaceID, userID int64) (bool, error)
}

type PageRepository interface {
	Create(ctx context.Context, page *Page) error
	GetByID(ctx context.Context, id string) (*Page, error)
	GetByWorkspaceID(ctx context.Context, workspaceID int64, includeArchived bool) ([]*Page, error)
	GetByParentID(ctx context.Context, parentID string, includeArchived bool) ([]*Page, error)
	GetRootPages(ctx context.Context, workspaceID int64, includeArchived bool) ([]*Page, error)
	Update(ctx context.Context, page *Page) error
	Delete(ctx context.Context, id string) error
	Archive(ctx context.Context, id string, archivedBy int64) error
	Restore(ctx context.Context, id string, restoredBy int64) error
	Search(ctx context.Context, workspaceID int64, query string, limit, offset int) ([]*Page, error)
	GetRecentPages(ctx context.Context, userID int64, limit int) ([]*Page, error)
	CreateVersion(ctx context.Context, version *PageVersion) error
	GetVersions(ctx context.Context, pageID string, limit, offset int) ([]*PageVersion, error)
	GetVersion(ctx context.Context, pageID string, versionNumber int) (*PageVersion, error)
	GetUserPermission(ctx context.Context, pageID string, userID int64) (*PagePermission, error)
	GrantPermission(ctx context.Context, permission *PagePermission) error
	RevokePermission(ctx context.Context, pageID string, userID int64) error
	ListPermissions(ctx context.Context, pageID string) ([]*PagePermission, error)
	HasPermission(ctx context.Context, pageID string, userID int64, requiredLevel PermissionLevel) (bool, error)
}

type BlockRepository interface {
	Create(ctx context.Context, block *Block) error
	GetByID(ctx context.Context, id string) (*Block, error)
	GetByPageID(ctx context.Context, pageID string) ([]*Block, error)
	GetByParentID(ctx context.Context, parentBlockID string) ([]*Block, error)
	Update(ctx context.Context, block *Block) error
	Delete(ctx context.Context, id string) error
	BulkCreate(ctx context.Context, blocks []*Block) error
	BulkUpdate(ctx context.Context, blocks []*Block) error
	BulkDelete(ctx context.Context, ids []string) error
	ReorderBlocks(ctx context.Context, pageID string, blockOrders map[string]int) error
	GetBlocksByType(ctx context.Context, pageID string, blockType string) ([]*Block, error)
}

type CommentRepository interface {
	Create(ctx context.Context, comment *Comment) error
	GetByID(ctx context.Context, id string) (*Comment, error)
	GetByPageID(ctx context.Context, pageID string) ([]*Comment, error)
	GetByBlockID(ctx context.Context, blockID string) ([]*Comment, error)
	GetReplies(ctx context.Context, parentCommentID string) ([]*Comment, error)
	Update(ctx context.Context, comment *Comment) error
	Delete(ctx context.Context, id string) error
	Resolve(ctx context.Context, id string, resolvedBy int64) error
	Unresolve(ctx context.Context, id string) error
	GetUnresolved(ctx context.Context, pageID string) ([]*Comment, error)
}
