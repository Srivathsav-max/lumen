package resolvers

import (
	"context"
)

// userIDKey is the key for user ID in the context
type userIDKey struct{}

// WithUserID adds the user ID to the context
func WithUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, userIDKey{}, userID)
}

// GetUserID gets the user ID from the context
func GetUserID(ctx context.Context) (int64, bool) {
	userID, ok := ctx.Value(userIDKey{}).(int64)
	return userID, ok
}
