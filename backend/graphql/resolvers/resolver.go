package resolvers

import (
	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/models"
)

// Resolver is the resolver for GraphQL queries
type Resolver struct {
	UserService models.UserService
	Config      *config.Config
}

// NewResolver creates a new resolver
func NewResolver(userService models.UserService, cfg *config.Config) *Resolver {
	return &Resolver{
		UserService: userService,
		Config:      cfg,
	}
}
