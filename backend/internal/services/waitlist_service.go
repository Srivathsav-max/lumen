package services

import (
	"context"
	"database/sql"
	"log/slog"
	"math"

	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

// WaitlistServiceImpl implements the WaitlistService interface
type WaitlistServiceImpl struct {
	waitlistRepo repository.WaitlistRepository
	logger       *slog.Logger
	validator    *Validator
}

// NewWaitlistService creates a new WaitlistService implementation
func NewWaitlistService(
	waitlistRepo repository.WaitlistRepository,
	logger *slog.Logger,
) WaitlistService {
	return &WaitlistServiceImpl{
		waitlistRepo: waitlistRepo,
		logger:       logger,
		validator:    NewValidator(),
	}
}

// AddToWaitlist adds a user to the waitlist
func (s *WaitlistServiceImpl) AddToWaitlist(ctx context.Context, req *WaitlistRequest) error {
	// Validate the waitlist request
	if err := ValidateWaitlistRequest(s.validator, req); err != nil {
		s.logger.Warn("Waitlist validation failed",
			"email", req.Email,
			"error", err,
		)
		return err
	}

	s.logger.Info("Adding user to waitlist",
		"email", req.Email,
		"first_name", req.FirstName,
		"last_name", req.LastName,
	)

	// Check if user is already on waitlist
	exists, err := s.waitlistRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		s.logger.Error("Failed to check if user exists on waitlist",
			"email", req.Email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist signup", err)
	}
	if exists {
		return NewWaitlistAlreadyExistsError(req.Email)
	}

	// Create waitlist entry
	waitlistEntry := &repository.WaitlistEntry{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Reason:    req.Reason,
		Status:    "pending", // Default status
	}

	if err := s.waitlistRepo.Create(ctx, waitlistEntry); err != nil {
		s.logger.Error("Failed to add user to waitlist",
			"email", req.Email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist signup", err)
	}

	s.logger.Info("User added to waitlist successfully",
		"email", req.Email,
		"waitlist_id", waitlistEntry.ID,
	)

	return nil
}

// GetWaitlistPosition retrieves a user's position in the waitlist
func (s *WaitlistServiceImpl) GetWaitlistPosition(ctx context.Context, email string) (*WaitlistPositionResponse, error) {
	// Validate email
	if email == "" {
		return nil, NewInvalidEmailError()
	}

	// Get waitlist entry
	entry, err := s.waitlistRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, NewWaitlistNotFoundError(email)
		}
		s.logger.Error("Failed to get waitlist entry",
			"email", email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("waitlist position retrieval", err)
	}

	// Get position (count of entries created before this one with pending status)
	position, err := s.waitlistRepo.GetPositionByEmail(ctx, email)
	if err != nil {
		s.logger.Error("Failed to get waitlist position",
			"email", email,
			"error", err,
		)
		return nil, NewServiceUnavailableError("waitlist position retrieval", err)
	}

	response := &WaitlistPositionResponse{
		Email:     entry.Email,
		Position:  position,
		CreatedAt: entry.CreatedAt,
		Status:    entry.Status,
	}

	return response, nil
}

// RemoveFromWaitlist removes a user from the waitlist
func (s *WaitlistServiceImpl) RemoveFromWaitlist(ctx context.Context, email string) error {
	// Validate email
	if email == "" {
		return NewInvalidEmailError()
	}

	s.logger.Info("Removing user from waitlist", "email", email)

	// Check if entry exists
	_, err := s.waitlistRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewWaitlistNotFoundError(email)
		}
		s.logger.Error("Failed to get waitlist entry for removal",
			"email", email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist removal", err)
	}

	// Remove from waitlist
	if err := s.waitlistRepo.DeleteByEmail(ctx, email); err != nil {
		s.logger.Error("Failed to remove user from waitlist",
			"email", email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist removal", err)
	}

	s.logger.Info("User removed from waitlist successfully", "email", email)
	return nil
}

// GetWaitlistEntries retrieves paginated waitlist entries (admin only)
func (s *WaitlistServiceImpl) GetWaitlistEntries(ctx context.Context, req *GetWaitlistRequest) (*WaitlistListResponse, error) {
	// Validate request
	if err := ValidateGetWaitlistRequest(s.validator, req); err != nil {
		s.logger.Warn("Get waitlist entries validation failed", "error", err)
		return nil, err
	}

	// Set defaults if not provided
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	// Calculate offset
	offset := (req.Page - 1) * req.PageSize

	// Get entries from repository
	entries, err := s.waitlistRepo.GetPaginated(ctx, req.PageSize, offset, req.Status, req.Search)
	if err != nil {
		s.logger.Error("Failed to get waitlist entries",
			"page", req.Page,
			"page_size", req.PageSize,
			"error", err,
		)
		return nil, NewServiceUnavailableError("waitlist entries retrieval", err)
	}

	// Get total count
	total, err := s.waitlistRepo.GetTotalCount(ctx, req.Status, req.Search)
	if err != nil {
		s.logger.Error("Failed to get waitlist total count", "error", err)
		return nil, NewServiceUnavailableError("waitlist entries retrieval", err)
	}

	// Convert to response DTOs
	entryResponses := make([]WaitlistEntryResponse, len(entries))
	for i, entry := range entries {
		// Get position for each entry
		position, _ := s.waitlistRepo.GetPositionByEmail(ctx, entry.Email)
		
		entryResponses[i] = WaitlistEntryResponse{
			ID:        entry.ID,
			Email:     entry.Email,
			FirstName: entry.FirstName,
			LastName:  entry.LastName,
			Reason:    entry.Reason,
			Status:    entry.Status,
			Position:  position,
			CreatedAt: entry.CreatedAt,
			UpdatedAt: entry.UpdatedAt,
		}
	}

	// Calculate total pages
	totalPages := int(math.Ceil(float64(total) / float64(req.PageSize)))

	response := &WaitlistListResponse{
		Entries:    entryResponses,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}

	return response, nil
}

// ApproveWaitlistEntry approves a waitlist entry
func (s *WaitlistServiceImpl) ApproveWaitlistEntry(ctx context.Context, email string) error {
	// Validate email
	if email == "" {
		return NewInvalidEmailError()
	}

	s.logger.Info("Approving waitlist entry", "email", email)

	// Get waitlist entry
	entry, err := s.waitlistRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return NewWaitlistNotFoundError(email)
		}
		s.logger.Error("Failed to get waitlist entry for approval",
			"email", email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist approval", err)
	}

	// Check if already approved
	if entry.Status == "approved" {
		s.logger.Info("Waitlist entry already approved", "email", email)
		return nil
	}

	// Update status to approved
	entry.Status = "approved"
	if err := s.waitlistRepo.Update(ctx, entry); err != nil {
		s.logger.Error("Failed to approve waitlist entry",
			"email", email,
			"error", err,
		)
		return NewServiceUnavailableError("waitlist approval", err)
	}

	s.logger.Info("Waitlist entry approved successfully", "email", email)
	return nil
}