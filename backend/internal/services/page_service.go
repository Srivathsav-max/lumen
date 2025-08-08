package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type PageService interface {
	CreatePage(ctx context.Context, userID int64, req *CreatePageRequest) (*PageResponse, error)
	GetPage(ctx context.Context, userID int64, pageID string) (*PageResponse, error)
	GetPageWithBlocks(ctx context.Context, userID int64, pageID string) (*PageResponse, error)
	GetWorkspacePages(ctx context.Context, userID int64, workspaceID int64, includeArchived bool) ([]PageResponse, error)
	GetChildPages(ctx context.Context, userID int64, parentPageID string, includeArchived bool) ([]PageResponse, error)
	GetRootPages(ctx context.Context, userID int64, workspaceID int64, includeArchived bool) ([]PageResponse, error)
	UpdatePage(ctx context.Context, userID int64, pageID string, req *UpdatePageRequest) (*PageResponse, error)
	SavePageContent(ctx context.Context, userID int64, pageID string, req *SavePageContentRequest) (*PageResponse, error)
	DeletePage(ctx context.Context, userID int64, pageID string) error
	ArchivePage(ctx context.Context, userID int64, pageID string) error
	RestorePage(ctx context.Context, userID int64, pageID string) error
	SearchPages(ctx context.Context, userID int64, req *SearchPagesRequest) (*SearchPagesResponse, error)
	GetRecentPages(ctx context.Context, userID int64, limit int) ([]PageResponse, error)
	GetPageVersions(ctx context.Context, userID int64, pageID string, limit, offset int) ([]PageVersionResponse, error)
	GetPageVersion(ctx context.Context, userID int64, pageID string, versionNumber int) (*PageVersionResponse, error)
	GrantPermission(ctx context.Context, userID int64, pageID string, req *GrantPagePermissionRequest) (*PagePermissionResponse, error)
	RevokePermission(ctx context.Context, userID int64, pageID string, targetUserID int64) error
	GetPagePermissions(ctx context.Context, userID int64, pageID string) ([]PagePermissionResponse, error)
}

type pageService struct {
	pageRepo      repository.PageRepository
	blockRepo     repository.BlockRepository
	workspaceRepo repository.WorkspaceRepository
	userRepo      repository.UserRepository
	logger        *slog.Logger
}

func NewPageService(
	pageRepo repository.PageRepository,
	blockRepo repository.BlockRepository,
	workspaceRepo repository.WorkspaceRepository,
	userRepo repository.UserRepository,
	logger *slog.Logger,
) PageService {
	return &pageService{
		pageRepo:      pageRepo,
		blockRepo:     blockRepo,
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
		logger:        logger,
	}
}

func (s *pageService) CreatePage(ctx context.Context, userID int64, req *CreatePageRequest) (*PageResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check workspace access
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, req.WorkspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", req.WorkspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	// If parent page specified, check access
	if req.ParentID != nil {
		hasPermission, err := s.pageRepo.HasPermission(ctx, *req.ParentID, userID, repository.PermissionEdit)
		if err != nil {
			s.logger.Error("Failed to check parent page permission", "error", err, "page_id", *req.ParentID, "user_id", userID)
			return nil, NewInternalError("Failed to verify parent page access")
		}

		if !hasPermission {
			return nil, NewForbiddenError("Access denied to parent page")
		}
	}

	page := &repository.Page{
		Title:        req.Title,
		WorkspaceID:  req.WorkspaceID,
		OwnerID:      userID,
		ParentID:     req.ParentID,
		Icon:         req.Icon,
		CoverURL:     req.CoverURL,
		IsTemplate:   req.IsTemplate,
		Properties:   req.Properties,
		LastEditedBy: &userID,
	}

	if page.Title == "" {
		page.Title = "Untitled"
	}

	if len(page.Properties) == 0 {
		page.Properties = json.RawMessage("{}")
	}

	if err := s.pageRepo.Create(ctx, page); err != nil {
		s.logger.Error("Failed to create page", "error", err, "workspace_id", req.WorkspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to create page")
	}

	return s.toPageResponse(page, repository.PermissionAdmin, 0), nil
}

func (s *pageService) GetPage(ctx context.Context, userID int64, pageID string) (*PageResponse, error) {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionView)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Access denied to page")
	}

	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get page")
	}

	if page == nil {
		return nil, NewNotFoundError("Page not found")
	}

	// Get user's permission level
	permission, err := s.getUserPermissionLevel(ctx, userID, pageID)
	if err != nil {
		s.logger.Error("Failed to get user permission level", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to get permission level")
	}

	// Get children count
	children, err := s.pageRepo.GetByParentID(ctx, pageID, false)
	if err != nil {
		s.logger.Error("Failed to get child pages", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get child pages")
	}

	return s.toPageResponse(page, permission, len(children)), nil
}

func (s *pageService) GetPageWithBlocks(ctx context.Context, userID int64, pageID string) (*PageResponse, error) {
	// Get the page first
	pageResponse, err := s.GetPage(ctx, userID, pageID)
	if err != nil {
		return nil, err
	}

	// Get blocks
	blocks, err := s.blockRepo.GetByPageID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page blocks", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get page blocks")
	}

	// Convert blocks to responses
	blockResponses := make([]BlockResponse, len(blocks))
	for i, block := range blocks {
		blockResponses[i] = s.toBlockResponse(block)
	}

	pageResponse.Blocks = blockResponses
	return pageResponse, nil
}

func (s *pageService) GetWorkspacePages(ctx context.Context, userID int64, workspaceID int64, includeArchived bool) ([]PageResponse, error) {
	// Check workspace access
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, workspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", workspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	pages, err := s.pageRepo.GetByWorkspaceID(ctx, workspaceID, includeArchived)
	if err != nil {
		s.logger.Error("Failed to get workspace pages", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get pages")
	}

	responses := make([]PageResponse, 0, len(pages))
	for _, page := range pages {
		// Check if user has permission to view this page
		hasPermission, err := s.pageRepo.HasPermission(ctx, page.ID, userID, repository.PermissionView)
		if err != nil {
			s.logger.Error("Failed to check page permission", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		if !hasPermission {
			continue
		}

		// Get user's permission level
		permission, err := s.getUserPermissionLevel(ctx, userID, page.ID)
		if err != nil {
			s.logger.Error("Failed to get user permission level", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		// Get children count
		children, err := s.pageRepo.GetByParentID(ctx, page.ID, false)
		if err != nil {
			s.logger.Error("Failed to get child pages", "error", err, "page_id", page.ID)
			continue
		}

		responses = append(responses, *s.toPageResponse(page, permission, len(children)))
	}

	return responses, nil
}

func (s *pageService) GetChildPages(ctx context.Context, userID int64, parentPageID string, includeArchived bool) ([]PageResponse, error) {
	// Check permission to parent page
	hasPermission, err := s.pageRepo.HasPermission(ctx, parentPageID, userID, repository.PermissionView)
	if err != nil {
		s.logger.Error("Failed to check parent page permission", "error", err, "page_id", parentPageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify parent page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Access denied to parent page")
	}

	pages, err := s.pageRepo.GetByParentID(ctx, parentPageID, includeArchived)
	if err != nil {
		s.logger.Error("Failed to get child pages", "error", err, "parent_id", parentPageID)
		return nil, NewInternalError("Failed to get child pages")
	}

	responses := make([]PageResponse, 0, len(pages))
	for _, page := range pages {
		// Check if user has permission to view this page
		hasPermission, err := s.pageRepo.HasPermission(ctx, page.ID, userID, repository.PermissionView)
		if err != nil {
			s.logger.Error("Failed to check page permission", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		if !hasPermission {
			continue
		}

		// Get user's permission level
		permission, err := s.getUserPermissionLevel(ctx, userID, page.ID)
		if err != nil {
			s.logger.Error("Failed to get user permission level", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		// Get children count
		children, err := s.pageRepo.GetByParentID(ctx, page.ID, false)
		if err != nil {
			s.logger.Error("Failed to get child pages", "error", err, "page_id", page.ID)
			continue
		}

		responses = append(responses, *s.toPageResponse(page, permission, len(children)))
	}

	return responses, nil
}

func (s *pageService) GetRootPages(ctx context.Context, userID int64, workspaceID int64, includeArchived bool) ([]PageResponse, error) {
	// Check workspace access
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, workspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", workspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	pages, err := s.pageRepo.GetRootPages(ctx, workspaceID, includeArchived)
	if err != nil {
		s.logger.Error("Failed to get root pages", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get root pages")
	}

	responses := make([]PageResponse, 0, len(pages))
	for _, page := range pages {
		// Check if user has permission to view this page
		hasPermission, err := s.pageRepo.HasPermission(ctx, page.ID, userID, repository.PermissionView)
		if err != nil {
			s.logger.Error("Failed to check page permission", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		if !hasPermission {
			continue
		}

		// Get user's permission level
		permission, err := s.getUserPermissionLevel(ctx, userID, page.ID)
		if err != nil {
			s.logger.Error("Failed to get user permission level", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		// Get children count
		children, err := s.pageRepo.GetByParentID(ctx, page.ID, false)
		if err != nil {
			s.logger.Error("Failed to get child pages", "error", err, "page_id", page.ID)
			continue
		}

		responses = append(responses, *s.toPageResponse(page, permission, len(children)))
	}

	return responses, nil
}

func (s *pageService) UpdatePage(ctx context.Context, userID int64, pageID string, req *UpdatePageRequest) (*PageResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionEdit)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Access denied to edit page")
	}

	// Get current page
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get page")
	}

	if page == nil {
		return nil, NewNotFoundError("Page not found")
	}

	// Update fields if provided
	if req.Title != nil {
		page.Title = *req.Title
	}
	if req.Icon != nil {
		page.Icon = req.Icon
	}
	if req.CoverURL != nil {
		page.CoverURL = req.CoverURL
	}
	if req.IsTemplate != nil {
		page.IsTemplate = *req.IsTemplate
	}
	if req.Properties != nil {
		page.Properties = req.Properties
	}

	page.LastEditedBy = &userID

	if err := s.pageRepo.Update(ctx, page); err != nil {
		s.logger.Error("Failed to update page", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to update page")
	}

	// Get user's permission level
	permission, err := s.getUserPermissionLevel(ctx, userID, pageID)
	if err != nil {
		s.logger.Error("Failed to get user permission level", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to get permission level")
	}

	// Get children count
	children, err := s.pageRepo.GetByParentID(ctx, pageID, false)
	if err != nil {
		s.logger.Error("Failed to get child pages", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get child pages")
	}

	return s.toPageResponse(page, permission, len(children)), nil
}

func (s *pageService) SavePageContent(ctx context.Context, userID int64, pageID string, req *SavePageContentRequest) (*PageResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	s.logger.Info("SavePageContent called", "page_id", pageID, "user_id", userID, "has_title", req.Title != nil)

	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionEdit)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		s.logger.Warn("Access denied to edit page", "page_id", pageID, "user_id", userID)
		return nil, NewForbiddenError("Access denied to edit page")
	}

	// Get current page
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get page")
	}

	if page == nil {
		s.logger.Error("Page not found", "page_id", pageID)
		return nil, NewNotFoundError("Page not found")
	}

	// Update title if provided
	if req.Title != nil {
		s.logger.Info("Updating page title", "page_id", pageID, "old_title", page.Title, "new_title", *req.Title)
		page.Title = *req.Title
		page.LastEditedBy = &userID

		if err := s.pageRepo.Update(ctx, page); err != nil {
			s.logger.Error("Failed to update page", "error", err, "page_id", pageID)
			return nil, NewInternalError("Failed to update page")
		}
		s.logger.Info("Page title updated successfully", "page_id", pageID)
	}

	// Parse EditorJS content
	var editorContent struct {
		Time    int64                    `json:"time"`
		Blocks  []map[string]interface{} `json:"blocks"`
		Version string                   `json:"version"`
	}

	if err := json.Unmarshal(req.Content, &editorContent); err != nil {
		s.logger.Error("Failed to unmarshal content", "error", err, "page_id", pageID, "content_length", len(req.Content))
		return nil, NewBadRequestError("Invalid content format")
	}

	s.logger.Info("Parsed EditorJS content", "page_id", pageID, "blocks_count", len(editorContent.Blocks))

	// Simplified approach: Delete all existing blocks and recreate them
	// This is more reliable than trying to diff and update
	
	// Delete all existing blocks first
	existingBlocks, err := s.blockRepo.GetByPageID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get existing blocks", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get existing blocks")
	}

	s.logger.Info("Found existing blocks", "page_id", pageID, "existing_count", len(existingBlocks))

	if len(existingBlocks) > 0 {
		var blockIDsToDelete []string
		for _, block := range existingBlocks {
			blockIDsToDelete = append(blockIDsToDelete, block.ID)
		}
		
		s.logger.Info("Deleting existing blocks", "page_id", pageID, "count", len(blockIDsToDelete))
		if err := s.blockRepo.BulkDelete(ctx, blockIDsToDelete); err != nil {
			s.logger.Error("Failed to delete existing blocks", "error", err, "page_id", pageID)
			return nil, NewInternalError("Failed to delete existing blocks")
		}
		s.logger.Info("Existing blocks deleted successfully", "page_id", pageID)
	}

	// Create new blocks from EditorJS content
	if len(editorContent.Blocks) > 0 {
		var blocksToCreate []*repository.Block

		for i, blockData := range editorContent.Blocks {
			blockType, ok := blockData["type"].(string)
			if !ok {
				s.logger.Warn("Skipping block with missing type", "page_id", pageID, "block_index", i)
				continue
			}

			data, ok := blockData["data"]
			if !ok {
				data = map[string]interface{}{}
			}

			blockDataJSON, err := json.Marshal(data)
			if err != nil {
				s.logger.Error("Failed to marshal block data", "error", err, "page_id", pageID, "block_index", i)
				continue
			}

			newBlock := &repository.Block{
				PageID:       pageID,
				BlockType:    blockType,
				BlockData:    json.RawMessage(blockDataJSON),
				Position:     i,
				CreatedBy:    userID,
				LastEditedBy: &userID,
			}

			blocksToCreate = append(blocksToCreate, newBlock)
		}

		s.logger.Info("Creating new blocks", "page_id", pageID, "count", len(blocksToCreate))
		
		if len(blocksToCreate) > 0 {
			if err := s.blockRepo.BulkCreate(ctx, blocksToCreate); err != nil {
				s.logger.Error("Failed to create blocks", "error", err, "page_id", pageID)
				return nil, NewInternalError("Failed to create blocks")
			}
			s.logger.Info("New blocks created successfully", "page_id", pageID, "count", len(blocksToCreate))
		}
	}

	// Create version if we processed blocks
	if len(editorContent.Blocks) >= 0 { // Always create version for content saves
		s.logger.Info("Creating page version", "page_id", pageID)
		
		// Simple version numbering - just increment
		versionNumber := 1
		versions, err := s.pageRepo.GetVersions(ctx, pageID, 1, 0)
		if err == nil && len(versions) > 0 {
			versionNumber = versions[0].VersionNumber + 1
		}

		version := &repository.PageVersion{
			PageID:        pageID,
			VersionNumber: versionNumber,
			Title:         req.Title,
			Content:       req.Content,
			CreatedBy:     userID,
		}

		if err := s.pageRepo.CreateVersion(ctx, version); err != nil {
			s.logger.Error("Failed to create page version", "error", err, "page_id", pageID)
			// Don't fail the request if version creation fails
		} else {
			s.logger.Info("Page version created successfully", "page_id", pageID, "version_number", versionNumber)
		}
	}

	s.logger.Info("SavePageContent completed successfully", "page_id", pageID)
	return s.GetPageWithBlocks(ctx, userID, pageID)
}

func (s *pageService) DeletePage(ctx context.Context, userID int64, pageID string) error {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionAdmin)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return NewForbiddenError("Access denied to delete page")
	}

	if err := s.pageRepo.Delete(ctx, pageID); err != nil {
		s.logger.Error("Failed to delete page", "error", err, "page_id", pageID)
		return NewInternalError("Failed to delete page")
	}

	return nil
}

func (s *pageService) ArchivePage(ctx context.Context, userID int64, pageID string) error {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionEdit)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return NewForbiddenError("Access denied to archive page")
	}

	if err := s.pageRepo.Archive(ctx, pageID, userID); err != nil {
		s.logger.Error("Failed to archive page", "error", err, "page_id", pageID)
		return NewInternalError("Failed to archive page")
	}

	return nil
}

func (s *pageService) RestorePage(ctx context.Context, userID int64, pageID string) error {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionEdit)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return NewForbiddenError("Access denied to restore page")
	}

	if err := s.pageRepo.Restore(ctx, pageID, userID); err != nil {
		s.logger.Error("Failed to restore page", "error", err, "page_id", pageID)
		return NewInternalError("Failed to restore page")
	}

	return nil
}

func (s *pageService) SearchPages(ctx context.Context, userID int64, req *SearchPagesRequest) (*SearchPagesResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check workspace access
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, req.WorkspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", req.WorkspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	pages, err := s.pageRepo.Search(ctx, req.WorkspaceID, req.Query, req.Limit, req.Offset)
	if err != nil {
		s.logger.Error("Failed to search pages", "error", err, "workspace_id", req.WorkspaceID, "query", req.Query)
		return nil, NewInternalError("Failed to search pages")
	}

	responses := make([]PageResponse, 0, len(pages))
	for _, page := range pages {
		// Check if user has permission to view this page
		hasPermission, err := s.pageRepo.HasPermission(ctx, page.ID, userID, repository.PermissionView)
		if err != nil {
			s.logger.Error("Failed to check page permission", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		if !hasPermission {
			continue
		}

		// Get user's permission level
		permission, err := s.getUserPermissionLevel(ctx, userID, page.ID)
		if err != nil {
			s.logger.Error("Failed to get user permission level", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		// Get children count
		children, err := s.pageRepo.GetByParentID(ctx, page.ID, false)
		if err != nil {
			s.logger.Error("Failed to get child pages", "error", err, "page_id", page.ID)
			continue
		}

		responses = append(responses, *s.toPageResponse(page, permission, len(children)))
	}

	return &SearchPagesResponse{
		Pages:  responses,
		Total:  int64(len(responses)), // This is approximate since we filter after search
		Limit:  req.Limit,
		Offset: req.Offset,
	}, nil
}

func (s *pageService) GetRecentPages(ctx context.Context, userID int64, limit int) ([]PageResponse, error) {
	pages, err := s.pageRepo.GetRecentPages(ctx, userID, limit)
	if err != nil {
		s.logger.Error("Failed to get recent pages", "error", err, "user_id", userID)
		return nil, NewInternalError("Failed to get recent pages")
	}

	responses := make([]PageResponse, 0, len(pages))
	for _, page := range pages {
		// Check if user has permission to view this page
		hasPermission, err := s.pageRepo.HasPermission(ctx, page.ID, userID, repository.PermissionView)
		if err != nil {
			s.logger.Error("Failed to check page permission", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		if !hasPermission {
			continue
		}

		// Get user's permission level
		permission, err := s.getUserPermissionLevel(ctx, userID, page.ID)
		if err != nil {
			s.logger.Error("Failed to get user permission level", "error", err, "page_id", page.ID, "user_id", userID)
			continue
		}

		// Get children count
		children, err := s.pageRepo.GetByParentID(ctx, page.ID, false)
		if err != nil {
			s.logger.Error("Failed to get child pages", "error", err, "page_id", page.ID)
			continue
		}

		responses = append(responses, *s.toPageResponse(page, permission, len(children)))
	}

	return responses, nil
}

func (s *pageService) GetPageVersions(ctx context.Context, userID int64, pageID string, limit, offset int) ([]PageVersionResponse, error) {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionView)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Access denied to page")
	}

	versions, err := s.pageRepo.GetVersions(ctx, pageID, limit, offset)
	if err != nil {
		s.logger.Error("Failed to get page versions", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get page versions")
	}

	responses := make([]PageVersionResponse, len(versions))
	for i, version := range versions {
		responses[i] = *s.toPageVersionResponse(version)
	}

	return responses, nil
}

func (s *pageService) GetPageVersion(ctx context.Context, userID int64, pageID string, versionNumber int) (*PageVersionResponse, error) {
	// Check permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionView)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Access denied to page")
	}

	version, err := s.pageRepo.GetVersion(ctx, pageID, versionNumber)
	if err != nil {
		s.logger.Error("Failed to get page version", "error", err, "page_id", pageID, "version", versionNumber)
		return nil, NewInternalError("Failed to get page version")
	}

	if version == nil {
		return nil, NewNotFoundError("Page version not found")
	}

	return s.toPageVersionResponse(version), nil
}

func (s *pageService) GrantPermission(ctx context.Context, userID int64, pageID string, req *GrantPagePermissionRequest) (*PagePermissionResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check if user has admin permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionAdmin)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Insufficient permissions to grant access")
	}

	// Check if target user exists
	targetUser, err := s.userRepo.GetByID(ctx, req.UserID)
	if err != nil {
		s.logger.Error("Failed to get user", "error", err, "user_id", req.UserID)
		return nil, NewInternalError("Failed to verify user")
	}

	if targetUser == nil {
		return nil, NewNotFoundError("User not found")
	}

	// Parse permission level
	var permissionLevel repository.PermissionLevel
	switch req.Permission {
	case "view":
		permissionLevel = repository.PermissionView
	case "comment":
		permissionLevel = repository.PermissionComment
	case "edit":
		permissionLevel = repository.PermissionEdit
	case "admin":
		permissionLevel = repository.PermissionAdmin
	default:
		return nil, NewValidationError(fmt.Errorf("invalid permission level: %s", req.Permission))
	}

	permission := &repository.PagePermission{
		PageID:     pageID,
		UserID:     req.UserID,
		Permission: permissionLevel,
		GrantedBy:  userID,
	}

	if err := s.pageRepo.GrantPermission(ctx, permission); err != nil {
		s.logger.Error("Failed to grant page permission", "error", err, "page_id", pageID, "user_id", req.UserID)
		return nil, NewInternalError("Failed to grant permission")
	}

	return s.toPagePermissionResponse(permission, targetUser), nil
}

func (s *pageService) RevokePermission(ctx context.Context, userID int64, pageID string, targetUserID int64) error {
	// Check if user has admin permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionAdmin)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return NewForbiddenError("Insufficient permissions to revoke access")
	}

	// Cannot revoke permission from page owner
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page", "error", err, "page_id", pageID)
		return NewInternalError("Failed to get page")
	}

	if page.OwnerID == targetUserID {
		return NewBadRequestError("Cannot revoke permission from page owner")
	}

	if err := s.pageRepo.RevokePermission(ctx, pageID, targetUserID); err != nil {
		s.logger.Error("Failed to revoke page permission", "error", err, "page_id", pageID, "user_id", targetUserID)
		return NewInternalError("Failed to revoke permission")
	}

	return nil
}

func (s *pageService) GetPagePermissions(ctx context.Context, userID int64, pageID string) ([]PagePermissionResponse, error) {
	// Check if user has admin permission
	hasPermission, err := s.pageRepo.HasPermission(ctx, pageID, userID, repository.PermissionAdmin)
	if err != nil {
		s.logger.Error("Failed to check page permission", "error", err, "page_id", pageID, "user_id", userID)
		return nil, NewInternalError("Failed to verify page access")
	}

	if !hasPermission {
		return nil, NewForbiddenError("Insufficient permissions to view permissions")
	}

	permissions, err := s.pageRepo.ListPermissions(ctx, pageID)
	if err != nil {
		s.logger.Error("Failed to get page permissions", "error", err, "page_id", pageID)
		return nil, NewInternalError("Failed to get permissions")
	}

	responses := make([]PagePermissionResponse, 0, len(permissions))
	for _, permission := range permissions {
		user, err := s.userRepo.GetByID(ctx, permission.UserID)
		if err != nil {
			s.logger.Error("Failed to get user", "error", err, "user_id", permission.UserID)
			continue
		}

		if user == nil {
			continue
		}

		responses = append(responses, *s.toPagePermissionResponse(permission, user))
	}

	return responses, nil
}

func (s *pageService) getUserPermissionLevel(ctx context.Context, userID int64, pageID string) (repository.PermissionLevel, error) {
	// Check if user is page owner
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return "", err
	}

	if page.OwnerID == userID {
		return repository.PermissionAdmin, nil
	}

	// Get explicit permission
	permission, err := s.pageRepo.GetUserPermission(ctx, pageID, userID)
	if err != nil {
		return "", err
	}

	if permission != nil {
		return permission.Permission, nil
	}

	// Default view permission for workspace members
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, page.WorkspaceID, userID)
	if err != nil {
		return "", err
	}

	if hasAccess {
		return repository.PermissionView, nil
	}

	return "", NewForbiddenError("No access to page")
}

func (s *pageService) toPageResponse(page *repository.Page, permission repository.PermissionLevel, childrenCount int) *PageResponse {
	return &PageResponse{
		ID:            page.ID,
		Title:         page.Title,
		WorkspaceID:   page.WorkspaceID,
		OwnerID:       page.OwnerID,
		ParentID:      page.ParentID,
		Icon:          page.Icon,
		CoverURL:      page.CoverURL,
		IsArchived:    page.IsArchived,
		IsTemplate:    page.IsTemplate,
		Properties:    page.Properties,
		CreatedAt:     page.CreatedAt,
		UpdatedAt:     page.UpdatedAt,
		LastEditedBy:  page.LastEditedBy,
		Permission:    string(permission),
		ChildrenCount: childrenCount,
	}
}

func (s *pageService) toBlockResponse(block *repository.Block) BlockResponse {
	return BlockResponse{
		ID:            block.ID,
		PageID:        block.PageID,
		BlockType:     block.BlockType,
		BlockData:     block.BlockData,
		Position:      block.Position,
		ParentBlockID: block.ParentBlockID,
		CreatedAt:     block.CreatedAt,
		UpdatedAt:     block.UpdatedAt,
		CreatedBy:     block.CreatedBy,
		LastEditedBy:  block.LastEditedBy,
	}
}

func (s *pageService) toPageVersionResponse(version *repository.PageVersion) *PageVersionResponse {
	return &PageVersionResponse{
		ID:            version.ID,
		PageID:        version.PageID,
		VersionNumber: version.VersionNumber,
		Title:         version.Title,
		Content:       version.Content,
		ChangeSummary: version.ChangeSummary,
		CreatedBy:     version.CreatedBy,
		CreatedAt:     version.CreatedAt,
	}
}

func (s *pageService) toPagePermissionResponse(permission *repository.PagePermission, user *repository.User) *PagePermissionResponse {
	return &PagePermissionResponse{
		ID:         permission.ID,
		PageID:     permission.PageID,
		UserID:     permission.UserID,
		Username:   user.Username,
		Email:      user.Email,
		Permission: string(permission.Permission),
		GrantedBy:  permission.GrantedBy,
		CreatedAt:  permission.CreatedAt,
		UpdatedAt:  permission.UpdatedAt,
	}
}