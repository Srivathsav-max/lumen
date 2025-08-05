package resolvers

import (
	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/internal/services"
)

type Resolver struct {
	UserService services.UserService
	Config      *config.Config
}

func NewResolver(userService services.UserService, cfg *config.Config) *Resolver {
	return &Resolver{
		UserService: userService,
		Config:      cfg,
	}
}
