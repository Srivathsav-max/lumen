package services

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type WorkspaceService interface {
	CreateWorkspace(ctx context.Context, userID int64, req *CreateWorkspaceRequest) (*WorkspaceResponse, error)
	GetWorkspace(ctx context.Context, userID int64, workspaceID int64) (*WorkspaceResponse, error)
	GetUserWorkspaces(ctx context.Context, userID int64) ([]WorkspaceResponse, error)
	UpdateWorkspace(ctx context.Context, userID int64, workspaceID int64, req *UpdateWorkspaceRequest) (*WorkspaceResponse, error)
	DeleteWorkspace(ctx context.Context, userID int64, workspaceID int64) error
	AddMember(ctx context.Context, userID int64, workspaceID int64, req *AddWorkspaceMemberRequest) (*WorkspaceMemberResponse, error)
	RemoveMember(ctx context.Context, userID int64, workspaceID int64, memberUserID int64) error
	GetMembers(ctx context.Context, userID int64, workspaceID int64) ([]WorkspaceMemberResponse, error)
	UpdateMemberRole(ctx context.Context, userID int64, workspaceID int64, memberUserID int64, role string) error
	HasAccess(ctx context.Context, userID int64, workspaceID int64) (bool, error)
	GetUserRole(ctx context.Context, userID int64, workspaceID int64) (repository.WorkspaceRole, error)
}

type workspaceService struct {
	workspaceRepo repository.WorkspaceRepository
	userRepo      repository.UserRepository
	logger        *slog.Logger
}

func NewWorkspaceService(
	workspaceRepo repository.WorkspaceRepository,
	userRepo repository.UserRepository,
	logger *slog.Logger,
) WorkspaceService {
	return &workspaceService{
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
		logger:        logger,
	}
}

func (s *workspaceService) CreateWorkspace(ctx context.Context, userID int64, req *CreateWorkspaceRequest) (*WorkspaceResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	workspace := &repository.Workspace{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
	}

	if err := s.workspaceRepo.Create(ctx, workspace); err != nil {
		s.logger.Error("Failed to create workspace", "error", err, "user_id", userID)
		return nil, NewInternalError("Failed to create workspace")
	}

	return s.toWorkspaceResponse(workspace, repository.WorkspaceRoleOwner, 1), nil
}

func (s *workspaceService) GetWorkspace(ctx context.Context, userID int64, workspaceID int64) (*WorkspaceResponse, error) {
	// Check if user has access to workspace
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, workspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", workspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get workspace")
	}

	if workspace == nil {
		return nil, NewNotFoundError("Workspace not found")
	}

	// Get user's role
	role, err := s.GetUserRole(ctx, userID, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get user role", "error", err, "workspace_id", workspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to get user role")
	}

	// Get member count
	members, err := s.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace members", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get workspace members")
	}

	return s.toWorkspaceResponse(workspace, role, len(members)), nil
}

func (s *workspaceService) GetUserWorkspaces(ctx context.Context, userID int64) ([]WorkspaceResponse, error) {
	workspaces, err := s.workspaceRepo.GetUserWorkspaces(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user workspaces", "error", err, "user_id", userID)
		return nil, NewInternalError("Failed to get workspaces")
	}

	responses := make([]WorkspaceResponse, 0, len(workspaces))
	for _, workspace := range workspaces {
		// Get user's role
		role, err := s.GetUserRole(ctx, userID, workspace.ID)
		if err != nil {
			s.logger.Error("Failed to get user role", "error", err, "workspace_id", workspace.ID, "user_id", userID)
			continue
		}

		// Get member count
		members, err := s.workspaceRepo.GetMembers(ctx, workspace.ID)
		if err != nil {
			s.logger.Error("Failed to get workspace members", "error", err, "workspace_id", workspace.ID)
			continue
		}

		responses = append(responses, *s.toWorkspaceResponse(workspace, role, len(members)))
	}

	return responses, nil
}

func (s *workspaceService) UpdateWorkspace(ctx context.Context, userID int64, workspaceID int64, req *UpdateWorkspaceRequest) (*WorkspaceResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check if user is admin or owner
	role, err := s.GetUserRole(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}

	if role != repository.WorkspaceRoleOwner && role != repository.WorkspaceRoleAdmin {
		return nil, NewForbiddenError("Insufficient permissions to update workspace")
	}

	// Get current workspace
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get workspace")
	}

	if workspace == nil {
		return nil, NewNotFoundError("Workspace not found")
	}

	// Update fields if provided
	if req.Name != nil {
		workspace.Name = *req.Name
	}
	if req.Description != nil {
		workspace.Description = req.Description
	}

	if err := s.workspaceRepo.Update(ctx, workspace); err != nil {
		s.logger.Error("Failed to update workspace", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to update workspace")
	}

	// Get member count
	members, err := s.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace members", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get workspace members")
	}

	return s.toWorkspaceResponse(workspace, role, len(members)), nil
}

func (s *workspaceService) DeleteWorkspace(ctx context.Context, userID int64, workspaceID int64) error {
	// Check if user is the owner
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return NewInternalError("Failed to get workspace")
	}

	if workspace == nil {
		return NewNotFoundError("Workspace not found")
	}

	if workspace.OwnerID != userID {
		return NewForbiddenError("Only workspace owner can delete workspace")
	}

	if err := s.workspaceRepo.Delete(ctx, workspaceID); err != nil {
		s.logger.Error("Failed to delete workspace", "error", err, "workspace_id", workspaceID)
		return NewInternalError("Failed to delete workspace")
	}

	return nil
}

func (s *workspaceService) AddMember(ctx context.Context, userID int64, workspaceID int64, req *AddWorkspaceMemberRequest) (*WorkspaceMemberResponse, error) {
	// Validate input
	if err := validateStruct(req); err != nil {
		return nil, NewValidationError(err)
	}

	// Check if user is admin or owner
	role, err := s.GetUserRole(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}

	if role != repository.WorkspaceRoleOwner && role != repository.WorkspaceRoleAdmin {
		return nil, NewForbiddenError("Insufficient permissions to add members")
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

	// Parse role
	var memberRole repository.WorkspaceRole
	switch req.Role {
	case "member":
		memberRole = repository.WorkspaceRoleMember
	case "admin":
		memberRole = repository.WorkspaceRoleAdmin
	default:
		return nil, NewValidationError(fmt.Errorf("invalid role: %s", req.Role))
	}

	member := &repository.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      req.UserID,
		Role:        memberRole,
		AddedBy:     userID,
	}

	if err := s.workspaceRepo.AddMember(ctx, member); err != nil {
		s.logger.Error("Failed to add workspace member", "error", err, "workspace_id", workspaceID, "user_id", req.UserID)
		return nil, NewInternalError("Failed to add member")
	}

	return s.toWorkspaceMemberResponse(member, targetUser), nil
}

func (s *workspaceService) RemoveMember(ctx context.Context, userID int64, workspaceID int64, memberUserID int64) error {
	// Check if user is admin or owner
	role, err := s.GetUserRole(ctx, userID, workspaceID)
	if err != nil {
		return err
	}

	if role != repository.WorkspaceRoleOwner && role != repository.WorkspaceRoleAdmin {
		return NewForbiddenError("Insufficient permissions to remove members")
	}

	// Cannot remove the workspace owner
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return NewInternalError("Failed to get workspace")
	}

	if workspace.OwnerID == memberUserID {
		return NewBadRequestError("Cannot remove workspace owner")
	}

	if err := s.workspaceRepo.RemoveMember(ctx, workspaceID, memberUserID); err != nil {
		s.logger.Error("Failed to remove workspace member", "error", err, "workspace_id", workspaceID, "user_id", memberUserID)
		return NewInternalError("Failed to remove member")
	}

	return nil
}

func (s *workspaceService) GetMembers(ctx context.Context, userID int64, workspaceID int64) ([]WorkspaceMemberResponse, error) {
	// Check if user has access to workspace
	hasAccess, err := s.workspaceRepo.HasAccess(ctx, workspaceID, userID)
	if err != nil {
		s.logger.Error("Failed to check workspace access", "error", err, "workspace_id", workspaceID, "user_id", userID)
		return nil, NewInternalError("Failed to verify workspace access")
	}

	if !hasAccess {
		return nil, NewForbiddenError("Access denied to workspace")
	}

	members, err := s.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace members", "error", err, "workspace_id", workspaceID)
		return nil, NewInternalError("Failed to get members")
	}

	responses := make([]WorkspaceMemberResponse, 0, len(members))
	for _, member := range members {
		user, err := s.userRepo.GetByID(ctx, member.UserID)
		if err != nil {
			s.logger.Error("Failed to get user", "error", err, "user_id", member.UserID)
			continue
		}

		if user == nil {
			continue
		}

		responses = append(responses, *s.toWorkspaceMemberResponse(member, user))
	}

	return responses, nil
}

func (s *workspaceService) UpdateMemberRole(ctx context.Context, userID int64, workspaceID int64, memberUserID int64, role string) error {
	// Check if user is owner (only owners can change roles)
	currentRole, err := s.GetUserRole(ctx, userID, workspaceID)
	if err != nil {
		return err
	}

	if currentRole != repository.WorkspaceRoleOwner {
		return NewForbiddenError("Only workspace owner can change member roles")
	}

	// Cannot change owner role
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return NewInternalError("Failed to get workspace")
	}

	if workspace.OwnerID == memberUserID {
		return NewBadRequestError("Cannot change workspace owner role")
	}

	// Parse role
	var memberRole repository.WorkspaceRole
	switch role {
	case "member":
		memberRole = repository.WorkspaceRoleMember
	case "admin":
		memberRole = repository.WorkspaceRoleAdmin
	default:
		return NewValidationError(fmt.Errorf("invalid role: %s", role))
	}

	if err := s.workspaceRepo.UpdateMemberRole(ctx, workspaceID, memberUserID, memberRole); err != nil {
		s.logger.Error("Failed to update member role", "error", err, "workspace_id", workspaceID, "user_id", memberUserID)
		return NewInternalError("Failed to update member role")
	}

	return nil
}

func (s *workspaceService) HasAccess(ctx context.Context, userID int64, workspaceID int64) (bool, error) {
	return s.workspaceRepo.HasAccess(ctx, workspaceID, userID)
}

func (s *workspaceService) GetUserRole(ctx context.Context, userID int64, workspaceID int64) (repository.WorkspaceRole, error) {
	// Check if user is workspace owner
	workspace, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace", "error", err, "workspace_id", workspaceID)
		return "", NewInternalError("Failed to get workspace")
	}

	if workspace == nil {
		return "", NewNotFoundError("Workspace not found")
	}

	if workspace.OwnerID == userID {
		return repository.WorkspaceRoleOwner, nil
	}

	// Get members to find user's role
	members, err := s.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		s.logger.Error("Failed to get workspace members", "error", err, "workspace_id", workspaceID)
		return "", NewInternalError("Failed to get workspace members")
	}

	for _, member := range members {
		if member.UserID == userID {
			return member.Role, nil
		}
	}

	return "", NewForbiddenError("User is not a member of this workspace")
}

func (s *workspaceService) toWorkspaceResponse(workspace *repository.Workspace, role repository.WorkspaceRole, memberCount int) *WorkspaceResponse {
	return &WorkspaceResponse{
		ID:          workspace.ID,
		Name:        workspace.Name,
		Description: workspace.Description,
		OwnerID:     workspace.OwnerID,
		CreatedAt:   workspace.CreatedAt,
		UpdatedAt:   workspace.UpdatedAt,
		MemberCount: memberCount,
		Role:        string(role),
	}
}

func (s *workspaceService) toWorkspaceMemberResponse(member *repository.WorkspaceMember, user *repository.User) *WorkspaceMemberResponse {
	return &WorkspaceMemberResponse{
		ID:        member.ID,
		UserID:    member.UserID,
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      string(member.Role),
		AddedBy:   member.AddedBy,
		CreatedAt: member.CreatedAt,
		UpdatedAt: member.UpdatedAt,
	}
}