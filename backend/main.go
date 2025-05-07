package main

import (
	"fmt"
	"log"

	"github.com/Srivathsav-max/lumen/backend/api"
	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/db"
	"github.com/Srivathsav-max/lumen/backend/graphql"
	"github.com/Srivathsav-max/lumen/backend/models"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	database, err := db.New(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := db.RunMigrations(database, &cfg.Database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := models.NewPostgresUserRepository(database)
	// Initialize role repository
	roleRepo := models.NewRoleRepository(database)
	// Initialize waitlist repository
	waitlistRepo := models.NewWaitlistRepository(database)
	// Initialize system settings repository
	systemSettingsRepo := models.NewPostgresSystemSettingsRepository(database.DB)

	// Initialize services
	userService := models.NewUserService(userRepo, roleRepo, cfg)
	// Initialize role service
	roleService := models.NewRoleService(roleRepo)
	// Initialize waitlist service
	waitlistService := models.NewWaitlistService(waitlistRepo)
	// Initialize system settings service
	systemSettingsService := models.NewSystemSettingsService(systemSettingsRepo)
	// Initialize token repository and service
	tokenRepo := models.NewTokenRepository(database.DB)
	tokenService := models.NewTokenService(tokenRepo, cfg.JWT.Secret)

	// Initialize handlers
	handler := api.NewHandler(userService, roleService, waitlistService, systemSettingsService, tokenService, cfg)

	// Setup router
	router := api.SetupRouter(handler, cfg)

	// Register GraphQL handlers
	if err := graphql.RegisterHandlers(router, userService, cfg); err != nil {
		log.Fatalf("Failed to register GraphQL handlers: %v", err)
	}

	// Start the server
	serverAddr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Server starting on %s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
