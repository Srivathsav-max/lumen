package services

import (
	"context"
	"database/sql"
	"log/slog"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type RoleServiceImpl struct {
	roleRepo  repository.RoleRepository
	userRepo  repository.UserRepository
	logger    *slog.Logger
	validator *Validator
}

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

func (s *RoleServiceImpl) AssignRole(ctx context.Context, userID int64, roleName string) error {
	s.logger.Info("Assigning role to user",
		"user_id", userID,
		"role_name", roleName,
	)

	if userID <= 0 {
		return NewInvalidUserIDError()
	}
	if roleName == "" {
		return NewInvalidRoleNameError()
	}

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

	hasRole, err := s.HasRole(ctx, userID, roleName)
	if err != nil {
		return err
	}
	if hasRole {
		s.logger.Info("User already has role",
			"user_id", userID,
			"role_name", roleName,
		)
		return nil
	}

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

func (s *RoleServiceImpl) RemoveRole(ctx context.Context, userID int64, roleName string) error {
	s.logger.Info("Removing role from user",
		"user_id", userID,
		"role_name", roleName,
	)

	if userID <= 0 {
		return NewInvalidUserIDError()
	}
	if roleName == "" {
		return NewInvalidRoleNameError()
	}

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

func (s *RoleServiceImpl) GetUserRoles(ctx context.Context, userID int64) ([]RoleResponse, error) {
	if userID <= 0 {
		return nil, NewInvalidUserIDError()
	}

	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user roles",
			"user_id", userID,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user roles retrieval", err)
	}

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

func (s *RoleServiceImpl) HasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	if userID <= 0 {
		return false, NewInvalidUserIDError()
	}
	if roleName == "" {
		return false, NewInvalidRoleNameError()
	}

	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return false, err
	}

	for _, role := range roles {
		if role.Name == roleName {
			return true, nil
		}
	}

	return false, nil
}

func (s *RoleServiceImpl) HasPermission(ctx context.Context, userID int64, resource, action string) (bool, error) {
	if userID <= 0 {
		return false, NewInvalidUserIDError()
	}
	if resource == "" {
		return false, NewInvalidResourceError()
	}
	if action == "" {
		return false, NewInvalidActionError()
	}

	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return false, err
	}

	for _, role := range roles {
		switch role.Name {
		case constants.RoleAdmin:
			return true, nil
		case "moderator":
			if resource == "users" && (action == "read" || action == "update") {
				return true, nil
			}
			if resource == "waitlist" && (action == "read" || action == "update") {
				return true, nil
			}
		case constants.RoleUser, constants.RoleFree:
			if resource == "profile" && (action == "read" || action == "update") {
				return true, nil
			}
		}
	}

	return false, nil
}
