package main

import (
	"flag"
	"log"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/db"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

func main() {
	var (
		action  = flag.String("action", "", "Migration action: up, down, force, status")
		version = flag.String("version", "", "Version to migrate to (for down/force)")
	)
	flag.Parse()

	if *action == "" {
		log.Fatal("Please specify an action: -action=up|down|force|status")
	}

	// Load environment variables from .env file
	// if err := godotenv.Load(); err != nil {
	// 	log.Printf("Warning: Error loading .env file: %v", err)
	// }

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.New(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	driver, err := postgres.WithInstance(database.DB, &postgres.Config{})
	if err != nil {
		log.Fatalf("Could not create migration driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://../../db/migrations",
		cfg.Database.DBName,
		driver,
	)
	if err != nil {
		log.Fatalf("Could not create migration instance: %v", err)
	}

	switch *action {
	case "status":
		showStatus(m)
	case "up":
		runUp(m)
	case "down":
		runDown(m, *version)
	case "force":
		forceVersion(m, *version)
	default:
		log.Fatalf("Unknown action: %s", *action)
	}
}

func showStatus(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if err != nil {
		if err == migrate.ErrNilVersion {
			log.Println("No migrations have been applied yet")
			return
		}
		log.Fatalf("Could not get migration version: %v", err)
	}

	status := "clean"
	if dirty {
		status = "dirty"
	}

	log.Printf("Current migration version: %d (status: %s)", version, status)
}

func runUp(m *migrate.Migrate) {
	log.Println("Running migrations up...")
	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			log.Println("No new migrations to apply")
			return
		}
		log.Fatalf("Could not run migrations: %v", err)
	}
	log.Println("Migrations completed successfully")
}

func runDown(m *migrate.Migrate, versionStr string) {
	if versionStr == "" {
		log.Fatal("Please specify a version to migrate down to: -version=N")
	}

	version, err := strconv.Atoi(versionStr)
	if err != nil {
		log.Fatalf("Invalid version number: %s", versionStr)
	}

	log.Printf("Migrating down to version %d...", version)
	if err := m.Migrate(uint(version)); err != nil {
		log.Fatalf("Could not migrate down: %v", err)
	}
	log.Printf("Successfully migrated down to version %d", version)
}

func forceVersion(m *migrate.Migrate, versionStr string) {
	if versionStr == "" {
		log.Fatal("Please specify a version to force: -version=N")
	}

	version, err := strconv.Atoi(versionStr)
	if err != nil {
		log.Fatalf("Invalid version number: %s", versionStr)
	}

	log.Printf("Forcing migration version to %d...", version)
	if err := m.Force(version); err != nil {
		log.Fatalf("Could not force migration version: %v", err)
	}
	log.Printf("Successfully forced migration version to %d", version)
}
