package services

import (
	"context"
	"database/sql"
	"log/slog"
	"math"

	"github.com/Srivathsav-max/lumen/backend/internal/constants"
	"github.com/Srivathsav-max/lumen/backend/internal/repository"
)

type WaitlistServiceImpl struct {
	waitlistRepo repository.WaitlistRepository
	logger       *slog.Logger
	validator    *Validator
}

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

func (s *WaitlistServiceImpl) AddToWaitlist(ctx context.Context, req *WaitlistRequest) error {
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

	waitlistEntry := &repository.WaitlistEntry{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Reason:    req.Reason,
		Status:    constants.WaitlistStatusPending,
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

func (s *WaitlistServiceImpl) GetWaitlistPosition(ctx context.Context, email string) (*WaitlistPositionResponse, error) {
	if email == "" {
		return nil, NewInvalidEmailError()
	}

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

func (s *WaitlistServiceImpl) RemoveFromWaitlist(ctx context.Context, email string) error {
	if email == "" {
		return NewInvalidEmailError()
	}

	s.logger.Info("Removing user from waitlist", "email", email)

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

func (s *WaitlistServiceImpl) GetWaitlistEntries(ctx context.Context, req *GetWaitlistRequest) (*WaitlistListResponse, error) {
	if err := ValidateGetWaitlistRequest(s.validator, req); err != nil {
		s.logger.Warn("Get waitlist entries validation failed", "error", err)
		return nil, err
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	offset := (req.Page - 1) * req.PageSize

	entries, err := s.waitlistRepo.GetPaginated(ctx, req.PageSize, offset, req.Status, req.Search)
	if err != nil {
		s.logger.Error("Failed to get waitlist entries",
			"page", req.Page,
			"page_size", req.PageSize,
			"error", err,
		)
		return nil, NewServiceUnavailableError("waitlist entries retrieval", err)
	}

	total, err := s.waitlistRepo.GetTotalCount(ctx, req.Status, req.Search)
	if err != nil {
		s.logger.Error("Failed to get waitlist total count", "error", err)
		return nil, NewServiceUnavailableError("waitlist entries retrieval", err)
	}

	entryResponses := make([]WaitlistEntryResponse, len(entries))
	for i, entry := range entries {
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

func (s *WaitlistServiceImpl) ApproveWaitlistEntry(ctx context.Context, email string) error {
	if email == "" {
		return NewInvalidEmailError()
	}

	s.logger.Info("Approving waitlist entry", "email", email)

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

	if entry.Status == constants.WaitlistStatusApproved {
		s.logger.Info("Waitlist entry already approved", "email", email)
		return nil
	}

	entry.Status = constants.WaitlistStatusApproved
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
