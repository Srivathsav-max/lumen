package services

import (
	"context"
	"database/sql"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// RoleServiceImpl implements the RoleService interface
type RoleServiceImpl struct {
	roleRepo  repository.RoleRepository
	userRepo  repository.UserRepository
	logger    *slog.Logger
	validator *Validator
}

// NewRoleService creates a new RoleService implementation
func NewRoleService(
	roleRepo repository.RoleRepository,
	userRepo repository.UserRepository,
	logger *slog.Logger,
) RoleService {
	return &RoleServiceImpl{
		roleRepo:  roleRepo,
		userRepo:  userRepo,
		logger:    logger,
		validator: NewValidator(),
	}
}

// AssignRole assigns a role to a user
func (s *RoleServiceImpl) AssignRole(ctx context.Context, userID int64, roleName string) error {
	s.logger.Info("Assigning role to user",
		"user_id", userID,
		"role_name", roleName,
	)

	// Validate inputs
	if userID <= 0 {
		return NewInvalidUserIDError()
	}
	if roleName == "" {
		return NewInvalidRoleNameError()
	}

	// Check if user exists
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user for role assignment",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("role assignment", err)
	}

	// Get role by name
	role, err := s.roleRepo.GetByName(ctx, roleName)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewRoleNotFoundError(roleName)
		}
		s.logger.Error("Failed to get role by name",
			"role_name", roleName,
			"error", err,
		)
		return NewServiceUnavailableError("role assignment", err)
	}

	// Check if user already has this role
	hasRole, err := s.HasRole(ctx, userID, roleName)
	if err != nil {
		return err
	}
	if hasRole {
		s.logger.Info("User already has role",
			"user_id", userID,
			"role_name", roleName,
		)
		return nil // Already has role, no action needed
	}

	// Assign role to user
	if err := s.roleRepo.AssignRoleToUser(ctx, userID, role.ID); err != nil {
		s.logger.Error("Failed to assign role to user",
			"user_id", userID,
			"role_id", role.ID,
			"role_name", roleName,
			"error", err,
		)
		return NewServiceUnavailableError("role assignment", err)
	}

	s.logger.Info("Role assigned successfully",
		"user_id", userID,
		"role_name", roleName,
	)

	return nil
}

// RemoveRole removes a role from a user
func (s *RoleServiceImpl) RemoveRole(ctx context.Context, userID int64, roleName string) error {
	s.logger.Info("Removing role from user",
		"user_id", userID,
		"role_name", roleName,
	)

	// Validate inputs
	if userID <= 0 {
		return NewInvalidUserIDError()
	}
	if roleName == "" {
		return NewInvalidRoleNameError()
	}

	// Check if user exists
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user for role removal",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("role removal", err)
	}

	// Get role by name
	role, err := s.roleRepo.GetByName(ctx, roleName)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewRoleNotFoundError(roleName)
		}
		s.logger.Error("Failed to get role by name",
			"role_name", roleName,
			"error", err,
		)
		return NewServiceUnavailableError("role removal", err)
	}

	// Remove role from user
	if err := s.roleRepo.RemoveRoleFromUser(ctx, userID, role.ID); err != nil {
		s.logger.Error("Failed to remove role from user",
			"user_id", userID,
			"role_id", role.ID,
			"role_name", roleName,
			"error", err,
		)
		return NewServiceUnavailableError("role removal", err)
	}

	s.logger.Info("Role removed successfully",
		"user_id", userID,
		"role_name", roleName,
	)

	return nil
}

// GetUserRoles retrieves all roles for a user
func (s *RoleServiceImpl) GetUserRoles(ctx context.Context, userID int64) ([]RoleResponse, error) {
	// Validate input
	if userID <= 0 {
		return nil, NewInvalidUserIDError()
	}

	// Get user roles from repository
	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user roles",
			"user_id", userID,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user roles retrieval", err)
	}

	// Convert to response DTOs
	roleResponses := make([]RoleResponse, len(roles))
	for i, role := range roles {
		roleResponses[i] = RoleResponse{
			ID:          role.ID,
			Name:        role.Name,
			Description: role.Description,
			Permissions: []string{}, // TODO: Implement permissions if needed
		}
	}

	return roleResponses, nil
}

// HasRole checks if a user has a specific role
func (s *RoleServiceImpl) HasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	// Validate inputs
	if userID <= 0 {
		return false, NewInvalidUserIDError()
	}
	if roleName == "" {
		return false, NewInvalidRoleNameError()
	}

	// Get user roles
	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return false, err
	}

	// Check if user has the specified role
	for _, role := range roles {
		if role.Name == roleName {
			return true, nil
		}
	}

	return false, nil
}

// HasPermission checks if a user has a specific permission
func (s *RoleServiceImpl) HasPermission(ctx context.Context, userID int64, resource, action string) (bool, error) {
	// Validate inputs
	if userID <= 0 {
		return false, NewInvalidUserIDError()
	}
	if resource == "" {
		return false, NewInvalidResourceError()
	}
	if action == "" {
		return false, NewInvalidActionError()
	}

	// For now, implement basic permission logic based on roles
	// In a more complex system, you would have a permissions table
	
	// Get user roles
	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return false, err
	}

	// Check permissions based on roles
	for _, role := range roles {
		switch role.Name {
		case "admin":
			// Admin has all permissions
			return true, nil
		case "moderator":
			// Moderator has limited permissions
			if resource == "users" && (action == "read" || action == "update") {
				return true, nil
			}
			if resource == "waitlist" && (action == "read" || action == "update") {
				return true, nil
			}
		case "user", "free":
			// Regular users have basic permissions
			if resource == "profile" && (action == "read" || action == "update") {
				return true, nil
			}
		}
	}

	return false, nil
}