package resolvers

import (
	"context"
)

type userIDKey struct{}

func WithUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, userIDKey{}, userID)
}

func GetUserID(ctx context.Context) (int64, bool) {
	userID, ok := ctx.Value(userIDKey{}).(int64)
	return userID, ok
}
