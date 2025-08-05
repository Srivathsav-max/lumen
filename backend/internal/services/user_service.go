package services

import (
	"context"
	"database/sql"
	"log/slog"
	"strings"
	"time"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
	"github.com/Srivathsav-max/lumen/backend/utils"
)

type UserServiceImpl struct {
	userRepo     repository.UserRepository
	roleRepo     repository.RoleRepository
	emailService EmailService
	logger       *slog.Logger
	validator    *Validator
}

func NewUserService(
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	emailService EmailService,
	logger *slog.Logger,
) UserService {
	return &UserServiceImpl{
		userRepo:     userRepo,
		roleRepo:     roleRepo,
		emailService: emailService,
		logger:       logger,
		validator:    NewValidator(),
	}
}

func (s *UserServiceImpl) Register(ctx context.Context, req *RegisterRequest) (*UserResponse, error) {
	if err := ValidateRegisterRequest(s.validator, req); err != nil {
		s.logger.Warn("Registration validation failed",
			"email", req.Email,
			"username", req.Username,
			"error", err,
		)
		return nil, err
	}

	exists, err := s.userRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		s.logger.Error("Failed to check if user exists by email",
			"email", req.Email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user registration", err)
	}
	if exists {
		return nil, NewUserAlreadyExistsError("email", req.Email)
	}

	exists, err = s.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		s.logger.Error("Failed to check if user exists by username",
			"username", req.Username,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user registration", err)
	}
	if exists {
		return nil, NewUserAlreadyExistsError("username", req.Username)
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		s.logger.Error("Failed to hash password",
			"email", req.Email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("password hashing", err)
	}

	user := &repository.User{
		Username:      req.Username,
		Email:         req.Email,
		PasswordHash:  hashedPassword,
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		EmailVerified: false,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		s.logger.Error("Failed to create user",
			"email", req.Email,
			"username", req.Username,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user creation", err)
	}

	if err := s.assignDefaultRole(ctx, user.ID); err != nil {
		s.logger.Error("Failed to assign default role to user",
			"user_id", user.ID,
			"email", req.Email,
			"error", err,
		)
	}

	s.logger.Info("User registered successfully",
		"user_id", user.ID,
		"email", req.Email,
		"username", req.Username,
	)

	return s.mapUserToResponseWithContext(ctx, user), nil
}

func (s *UserServiceImpl) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	if err := ValidateLoginRequest(s.validator, req); err != nil {
		s.logger.Warn("Login validation failed",
			"email", req.Email,
			"error", err,
		)
		return nil, err
	}

	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Warn("Login attempt with non-existent email",
				"email", req.Email,
			)
			return nil, NewInvalidCredentialsError()
		}
		s.logger.Error("Failed to get user by email",
			"email", req.Email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user authentication", err)
	}

	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		s.logger.Warn("Login attempt with invalid password",
			"email", req.Email,
			"user_id", user.ID,
		)
		return nil, NewInvalidCredentialsError()
	}

	if !user.EmailVerified {
		s.logger.Warn("Login attempt with unverified email",
			"email", req.Email,
			"user_id", user.ID,
		)
		return nil, NewEmailNotVerifiedError()
	}

	s.logger.Info("User logged in successfully",
		"user_id", user.ID,
		"email", req.Email,
	)

	return &AuthResponse{
		User: s.mapUserToResponseWithContext(ctx, user),
	}, nil
}

func (s *UserServiceImpl) GetProfile(ctx context.Context, userID int64) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user profile",
			"user_id", userID,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user profile retrieval", err)
	}

	return s.mapUserToResponseWithContext(ctx, user), nil
}

func (s *UserServiceImpl) UpdateProfile(ctx context.Context, userID int64, req *UpdateProfileRequest) error {
	if err := ValidateUpdateProfileRequest(s.validator, req); err != nil {
		s.logger.Warn("Profile update validation failed",
			"user_id", userID,
			"error", err,
		)
		return err
	}

	currentUser, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get current user for profile update",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("user profile update", err)
	}

	updatedUser := &repository.User{
		ID:            currentUser.ID,
		Username:      currentUser.Username,
		Email:         currentUser.Email,
		PasswordHash:  currentUser.PasswordHash,
		FirstName:     currentUser.FirstName,
		LastName:      currentUser.LastName,
		EmailVerified: currentUser.EmailVerified,
		CreatedAt:     currentUser.CreatedAt,
		UpdatedAt:     time.Now().UTC(),
	}

	if req.Username != nil {
		newUsername := strings.TrimSpace(*req.Username)
		if newUsername != currentUser.Username {
			exists, err := s.userRepo.ExistsByUsername(ctx, newUsername)
			if err != nil {
				s.logger.Error("Failed to check username availability",
					"user_id", userID,
					"username", newUsername,
					"error", err,
				)
				return NewServiceUnavailableError("username validation", err)
			}
			if exists {
				return NewUserAlreadyExistsError("username", newUsername)
			}
			updatedUser.Username = newUsername
		}
	}

	if req.Email != nil {
		newEmail := strings.TrimSpace(*req.Email)
		if newEmail != currentUser.Email {
			exists, err := s.userRepo.ExistsByEmail(ctx, newEmail)
			if err != nil {
				s.logger.Error("Failed to check email availability",
					"user_id", userID,
					"email", newEmail,
					"error", err,
				)
				return NewServiceUnavailableError("email validation", err)
			}
			if exists {
				return NewUserAlreadyExistsError("email", newEmail)
			}
			updatedUser.Email = newEmail
			updatedUser.EmailVerified = false
		}
	}

	if req.FirstName != nil {
		updatedUser.FirstName = strings.TrimSpace(*req.FirstName)
	}

	if req.LastName != nil {
		updatedUser.LastName = strings.TrimSpace(*req.LastName)
	}

	if err := s.userRepo.Update(ctx, updatedUser); err != nil {
		s.logger.Error("Failed to update user profile",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("user profile update", err)
	}

	s.logger.Info("User profile updated successfully",
		"user_id", userID,
		"username_changed", req.Username != nil,
		"email_changed", req.Email != nil,
	)

	return nil
}

func (s *UserServiceImpl) GetByID(ctx context.Context, userID int64) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user by ID",
			"user_id", userID,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user retrieval", err)
	}

	return s.mapUserToResponseWithContext(ctx, user), nil
}

func (s *UserServiceImpl) GetByEmail(ctx context.Context, email string) (*UserResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewUserNotFoundError("email")
		}
		s.logger.Error("Failed to get user by email",
			"email", email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("user retrieval", err)
	}

	return s.mapUserToResponseWithContext(ctx, user), nil
}

func (s *UserServiceImpl) VerifyEmail(ctx context.Context, userID int64) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user for email verification",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("email verification", err)
	}

	if user.EmailVerified {
		return nil
	}

	user.EmailVerified = true
	user.UpdatedAt = time.Now().UTC()

	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update user email verification status",
			"user_id", userID,
			"error", err,
		)
		return NewServiceUnavailableError("email verification", err)
	}

	s.logger.Info("User email verified successfully",
		"user_id", userID,
		"email", user.Email,
	)

	return nil
}

func (s *UserServiceImpl) IsEmailVerified(ctx context.Context, userID int64) (bool, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, NewUserNotFoundError("ID")
		}
		s.logger.Error("Failed to get user for email verification check",
			"user_id", userID,
			"error", err,
		)
		return false, NewServiceUnavailableError("email verification check", err)
	}

	return user.EmailVerified, nil
}

func (s *UserServiceImpl) assignDefaultRole(ctx context.Context, userID int64) error {
	freeRole, err := s.roleRepo.GetByName(ctx, constants.RoleFree)
	if err != nil {
		if err == sql.ErrNoRows {
			s.logger.Error("Default 'free' role not found in database")
			return NewRoleNotFoundError(constants.RoleFree)
		}
		return err
	}

	return s.roleRepo.AssignRoleToUser(ctx, userID, freeRole.ID)
}

func (s *UserServiceImpl) mapUserToResponse(user *repository.User) *UserResponse {
	return s.mapUserToResponseWithContext(context.Background(), user)
}

func (s *UserServiceImpl) mapUserToResponseWithContext(ctx context.Context, user *repository.User) *UserResponse {
	roles, err := s.roleRepo.GetUserRoles(ctx, user.ID)
	if err != nil {
		s.logger.Warn("Failed to get user roles for response mapping",
			"user_id", user.ID,
			"error", err,
		)
		roles = []*repository.Role{}
	}

	roleNames := make([]string, len(roles))
	isAdmin := false
	for i, role := range roles {
		roleNames[i] = role.Name
		if role.Name == constants.RoleAdmin {
			isAdmin = true
		}
	}

	return &UserResponse{
		ID:            user.ID,
		Username:      user.Username,
		Email:         user.Email,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		EmailVerified: user.EmailVerified,
		Roles:         roleNames,
		IsAdmin:       isAdmin,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
	}
}
