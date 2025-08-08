package main

import (
	"fmt"
	"log"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/db"
	internalConfig "github.com/Srivathsav-max/lumen/backend/internal/config"
	"github.com/Srivathsav-max/lumen/backend/internal/container"
	"github.com/Srivathsav-max/lumen/backend/internal/router"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	builder := container.NewBuilder()

	builder, err := builder.WithConfig(internalConfig.NewEnvConfigLoader())
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	builder, err = builder.WithLogger()
	if err != nil {
		log.Fatalf("Failed to setup logger: %v", err)
	}

	builder, err = builder.WithDatabase()
	if err != nil {
		log.Fatalf("Failed to setup database: %v", err)
	}

	builder, err = builder.WithRepositories()
	if err != nil {
		log.Fatalf("Failed to setup repositories: %v", err)
	}

	builder, err = builder.WithServices()
	if err != nil {
		log.Fatalf("Failed to setup services: %v", err)
	}

	builder, err = builder.WithSecurity()
	if err != nil {
		log.Fatalf("Failed to setup security: %v", err)
	}

	appContainer, err := builder.Build()

	if err != nil {
		log.Fatalf("Failed to build application container: %v", err)
	}

	cfg := appContainer.GetConfig()

	oldCfg := &config.DatabaseConfig{
		Host:            cfg.Database.Host,
		Port:            cfg.Database.Port,
		User:            cfg.Database.User,
		Password:        cfg.Database.Password,
		DBName:          cfg.Database.DBName,
		SSLMode:         cfg.Database.SSLMode,
		URL:             cfg.Database.URL,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
		ConnMaxIdleTime: cfg.Database.ConnMaxIdleTime,
	}

	database, err := db.New(oldCfg)
	if err != nil {
		log.Fatalf("Failed to connect to database for migrations: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(database, oldCfg); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	appRouter := router.NewRouter(appContainer)
	ginEngine := appRouter.SetupRoutes()

	serverAddr := fmt.Sprintf(":%d", cfg.Server.Port)
	appContainer.GetLogger().Info("Server starting", "address", serverAddr)

	if err := ginEngine.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
