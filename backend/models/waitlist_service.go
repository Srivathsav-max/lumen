package models

import (
	"fmt"
	"strings"
)

// WaitlistService defines the interface for waitlist business logic
type WaitlistService interface {
	GetAll() ([]*WaitlistEntry, error)
	GetByID(id int64) (*WaitlistEntry, error)
	GetByEmail(email string) (*WaitlistEntry, error)
	JoinWaitlist(email string, name string) error
	UpdateStatus(id int64, status string, notes string) error
	Delete(id int64) error
}

// WaitlistServiceImpl implements WaitlistService interface
type WaitlistServiceImpl struct {
	repo WaitlistRepository
}

// NewWaitlistService creates a new WaitlistServiceImpl
func NewWaitlistService(repo WaitlistRepository) WaitlistService {
	return &WaitlistServiceImpl{repo: repo}
}

// GetAll retrieves all waitlist entries
func (s *WaitlistServiceImpl) GetAll() ([]*WaitlistEntry, error) {
	return s.repo.GetAll()
}

// GetByID retrieves a waitlist entry by its ID
func (s *WaitlistServiceImpl) GetByID(id int64) (*WaitlistEntry, error) {
	return s.repo.GetByID(id)
}

// GetByEmail retrieves a waitlist entry by email
func (s *WaitlistServiceImpl) GetByEmail(email string) (*WaitlistEntry, error) {
	return s.repo.GetByEmail(email)
}

// JoinWaitlist adds a new email to the waitlist
func (s *WaitlistServiceImpl) JoinWaitlist(email string, name string) error {
	// Validate email
	email = strings.TrimSpace(email)
	if email == "" {
		return fmt.Errorf("email is required")
	}
	
	// Check if email is already in the waitlist
	existing, err := s.repo.GetByEmail(email)
	if err != nil {
		return fmt.Errorf("error checking existing email: %w", err)
	}
	
	if existing != nil {
		return fmt.Errorf("email is already on the waitlist")
	}
	
	// Create new waitlist entry
	entry := &WaitlistEntry{
		Email:  email,
		Name:   name,
		Status: "pending",
	}
	
	return s.repo.Create(entry)
}

// UpdateStatus updates the status and notes of a waitlist entry
func (s *WaitlistServiceImpl) UpdateStatus(id int64, status string, notes string) error {
	// Get existing entry
	entry, err := s.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("error getting waitlist entry: %w", err)
	}
	
	if entry == nil {
		return fmt.Errorf("waitlist entry not found")
	}
	
	// Validate status
	status = strings.TrimSpace(status)
	if status == "" {
		return fmt.Errorf("status is required")
	}
	
	// Update entry
	entry.Status = status
	entry.Notes = notes
	
	return s.repo.Update(entry)
}

// Delete removes a waitlist entry
func (s *WaitlistServiceImpl) Delete(id int64) error {
	return s.repo.Delete(id)
}
