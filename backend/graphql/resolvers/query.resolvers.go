package resolvers

import (
	"context"
	"errors"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

func (r *Resolver) User(ctx context.Context, id string) (*services.UserResponse, error) {
	userID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, errors.New("invalid user ID format")
	}

	user, err := r.UserService.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}

func (r *Resolver) Me(ctx context.Context) (*services.UserResponse, error) {
	userID, ok := GetUserID(ctx)
	if !ok {
		return nil, errors.New("not authenticated")
	}

	user, err := r.UserService.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}
