package models

import (
	"fmt"
)

// RoleServiceImpl implements RoleService interface
type RoleServiceImpl struct {
	repo RoleRepository
}

// NewRoleService creates a new RoleServiceImpl
func NewRoleService(repo RoleRepository) RoleService {
	return &RoleServiceImpl{repo: repo}
}

// GetByID retrieves a role by its ID
func (s *RoleServiceImpl) GetByID(id int64) (*Role, error) {
	return s.repo.GetByID(id)
}

// GetByName retrieves a role by its name
func (s *RoleServiceImpl) GetByName(name string) (*Role, error) {
	return s.repo.GetByName(name)
}

// GetAll retrieves all roles
func (s *RoleServiceImpl) GetAll() ([]*Role, error) {
	return s.repo.GetAll()
}

// Create creates a new role
func (s *RoleServiceImpl) Create(role *Role) error {
	// Validate role data
	if role.Name == "" {
		return fmt.Errorf("role name cannot be empty")
	}
	
	return s.repo.Create(role)
}

// Update updates an existing role
func (s *RoleServiceImpl) Update(role *Role) error {
	// Validate role data
	if role.Name == "" {
		return fmt.Errorf("role name cannot be empty")
	}
	
	return s.repo.Update(role)
}

// Delete deletes a role by its ID
func (s *RoleServiceImpl) Delete(id int64) error {
	return s.repo.Delete(id)
}

// AssignRoleToUser assigns a role to a user
func (s *RoleServiceImpl) AssignRoleToUser(userID, roleID int64) error {
	return s.repo.AssignRoleToUser(userID, roleID)
}

// RemoveRoleFromUser removes a role from a user
func (s *RoleServiceImpl) RemoveRoleFromUser(userID, roleID int64) error {
	return s.repo.RemoveRoleFromUser(userID, roleID)
}

// GetUserRoles retrieves all roles assigned to a user
func (s *RoleServiceImpl) GetUserRoles(userID int64) ([]*Role, error) {
	return s.repo.GetUserRoles(userID)
}

// HasRole checks if a user has a specific role
func (s *RoleServiceImpl) HasRole(userID int64, roleName string) (bool, error) {
	return s.repo.HasRole(userID, roleName)
}

// IsAdmin checks if a user has admin or developer role
func (s *RoleServiceImpl) IsAdmin(userID int64) (bool, error) {
	// Check if user has admin role
	hasAdminRole, err := s.repo.HasRole(userID, RoleAdmin)
	if err != nil {
		return false, err
	}
	
	if hasAdminRole {
		return true, nil
	}
	
	// Check if user has developer role
	hasDeveloperRole, err := s.repo.HasRole(userID, RoleDeveloper)
	if err != nil {
		return false, err
	}
	
	return hasDeveloperRole, nil
}
