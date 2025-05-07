package models

import (
	"time"
)

// Role represents a user role in the system
type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserRole represents the many-to-many relationship between users and roles
type UserRole struct {
	UserID    int64     `json:"user_id"`
	RoleID    int64     `json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
}

// RoleRepository defines the interface for role data operations
type RoleRepository interface {
	GetByID(id int64) (*Role, error)
	GetByName(name string) (*Role, error)
	GetAll() ([]*Role, error)
	Create(role *Role) error
	Update(role *Role) error
	Delete(id int64) error
	
	// User-Role relationship methods
	AssignRoleToUser(userID, roleID int64) error
	RemoveRoleFromUser(userID, roleID int64) error
	GetUserRoles(userID int64) ([]*Role, error)
	HasRole(userID int64, roleName string) (bool, error)
}

// RoleService defines the interface for role business logic
type RoleService interface {
	GetByID(id int64) (*Role, error)
	GetByName(name string) (*Role, error)
	GetAll() ([]*Role, error)
	Create(role *Role) error
	Update(role *Role) error
	Delete(id int64) error
	
	// User-Role relationship methods
	AssignRoleToUser(userID, roleID int64) error
	RemoveRoleFromUser(userID, roleID int64) error
	GetUserRoles(userID int64) ([]*Role, error)
	HasRole(userID int64, roleName string) (bool, error)
	
	// Helper method to check if user has admin role
	IsAdmin(userID int64) (bool, error)
}

// Role name constants
const (
	RoleAdmin        = "admin"
	RoleDeveloper    = "developer"
	RoleFree         = "free"
	RoleStudent      = "student"
	RoleTeacher      = "teacher"
	RoleOrganization = "organization"
)
