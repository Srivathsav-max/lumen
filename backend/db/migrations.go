package db

import (
	"fmt"
	"log"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

// RunMigrations runs all database migrations
func RunMigrations(db *DB, cfg *config.DatabaseConfig) error {
	log.Println("Running database migrations...")

	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("could not create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://db/migrations",
		cfg.DBName,
		driver,
	)
	if err != nil {
		return fmt.Errorf("could not create migration instance: %w", err)
	}

	// Check if database is in dirty state and fix it
	if err := fixDirtyMigration(m); err != nil {
		return fmt.Errorf("could not fix dirty migration: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("could not run migrations: %w", err)
	}

	log.Println("Migrations completed successfully")
	return nil
}

// fixDirtyMigration checks if the database is in a dirty state and fixes it
func fixDirtyMigration(m *migrate.Migrate) error {
	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("could not get migration version: %w", err)
	}

	if dirty {
		log.Printf("Database is in dirty state at version %d. Attempting to fix...", version)
		
		// Force the version to clean the dirty state
		if err := m.Force(int(version)); err != nil {
			return fmt.Errorf("could not force migration version %d: %w", version, err)
		}
		
		log.Printf("Successfully cleaned dirty state for version %d", version)
	}

	return nil
}
