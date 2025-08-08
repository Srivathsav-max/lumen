package db

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/Srivathsav-max/lumen/backend/config"
	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func New(cfg *config.DatabaseConfig) (*DB, error) {
	dsn := cfg.GetDSN()

	if cfg.URL != "" {
		log.Println("Using database connection string from DATABASE_URL environment variable")
	} else {
		log.Printf("Connecting to database at %s:%d/%s", cfg.Host, cfg.Port, cfg.DBName)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("error opening database connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to the database: %w", err)
	}

	log.Println("Successfully connected to the database")
	return &DB{db}, nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}
