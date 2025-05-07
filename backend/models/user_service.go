package models

import (
	"errors"
	"fmt"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/utils"
)

// UserServiceImpl implements UserService
type UserServiceImpl struct {
	repo       UserRepository
	roleRepo   RoleRepository
	roleService RoleService
	config     *config.Config
}

// NewUserService creates a new user service
func NewUserService(repo UserRepository, roleRepo RoleRepository, cfg *config.Config) *UserServiceImpl {
	// Create role service
	roleService := NewRoleService(roleRepo)
	
	return &UserServiceImpl{
		repo:       repo,
		roleRepo:   roleRepo,
		roleService: roleService,
		config:     cfg,
	}
}

// GetByID retrieves a user by their ID
func (s *UserServiceImpl) GetByID(id int64) (*User, error) {
	return s.repo.GetByID(id)
}

// GetByEmail retrieves a user by their email
func (s *UserServiceImpl) GetByEmail(email string) (*User, error) {
	return s.repo.GetByEmail(email)
}

// Register registers a new user
func (s *UserServiceImpl) Register(user *User) error {
	// Check if user with same email already exists
	existingUser, err := s.repo.GetByEmail(user.Email)
	if err != nil {
		return fmt.Errorf("error checking existing user: %w", err)
	}
	if existingUser != nil {
		return errors.New("user with this email already exists")
	}

	// Check if username is already taken
	existingUser, err = s.repo.GetByUsername(user.Username)
	if err != nil {
		return fmt.Errorf("error checking existing username: %w", err)
	}
	if existingUser != nil {
		return errors.New("username is already taken")
	}

	// Create the user
	err = s.repo.Create(user)
	if err != nil {
		return fmt.Errorf("error creating user: %w", err)
	}
	
	// Get the free role
	freeRole, err := s.roleRepo.GetByName(RoleFree)
	if err != nil {
		return fmt.Errorf("error getting free role: %w", err)
	}
	
	// Assign free role to the new user
	err = s.roleRepo.AssignRoleToUser(user.ID, freeRole.ID)
	if err != nil {
		return fmt.Errorf("error assigning free role to user: %w", err)
	}
	
	return nil
}

// Login authenticates a user and returns a JWT token
func (s *UserServiceImpl) Login(email, password string) (string, error) {
	// Get user by email
	user, err := s.repo.GetByEmail(email)
	if err != nil {
		return "", fmt.Errorf("error retrieving user: %w", err)
	}
	if user == nil {
		return "", errors.New("invalid credentials")
	}

	// Check password
	if !utils.CheckPassword(password, user.Password) {
		return "", errors.New("invalid credentials")
	}
	
	// Check if user has roles, if not assign free role
	userRoles, err := s.roleRepo.GetUserRoles(user.ID)
	if err != nil {
		return "", fmt.Errorf("error getting user roles: %w", err)
	}
	
	if len(userRoles) == 0 {
		// Get the free role
		freeRole, err := s.roleRepo.GetByName(RoleFree)
		if err != nil {
			return "", fmt.Errorf("error getting free role: %w", err)
		}
		
		// Assign free role to the user
		err = s.roleRepo.AssignRoleToUser(user.ID, freeRole.ID)
		if err != nil {
			return "", fmt.Errorf("error assigning free role to user: %w", err)
		}
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user.ID, s.config.JWT.Secret, 24) // 24 hours expiration
	if err != nil {
		return "", fmt.Errorf("error generating token: %w", err)
	}

	return token, nil
}

// UpdateProfile updates a user's profile
func (s *UserServiceImpl) UpdateProfile(user *User) error {
	// Check if email is already taken by another user
	if user.Email != "" {
		existingUser, err := s.repo.GetByEmail(user.Email)
		if err != nil {
			return fmt.Errorf("error checking existing email: %w", err)
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return errors.New("email is already taken")
		}
	}

	// Check if username is already taken by another user
	if user.Username != "" {
		existingUser, err := s.repo.GetByUsername(user.Username)
		if err != nil {
			return fmt.Errorf("error checking existing username: %w", err)
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return errors.New("username is already taken")
		}
	}

	// Update the user
	return s.repo.Update(user)
}
