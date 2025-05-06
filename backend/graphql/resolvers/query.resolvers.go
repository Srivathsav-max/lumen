package resolvers

import (
	"context"
	"errors"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/models"
)

// User returns a user by ID
func (r *Resolver) User(ctx context.Context, id string) (*models.User, error) {
	// Convert ID from string to int64
	userID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, errors.New("invalid user ID format")
	}

	// Get user from service
	user, err := r.UserService.GetByID(userID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}

// Me returns the current authenticated user
func (r *Resolver) Me(ctx context.Context) (*models.User, error) {
	// Get user ID from context
	userID, ok := GetUserID(ctx)
	if !ok {
		return nil, errors.New("not authenticated")
	}

	// Get user from service
	user, err := r.UserService.GetByID(userID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}
