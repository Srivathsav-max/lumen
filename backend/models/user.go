package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID            int64     `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	Password      string    `json:"-"` // Never expose password in JSON responses
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// UserRepository defines the interface for user data operations
type UserRepository interface {
	GetByID(id int64) (*User, error)
	GetByEmail(email string) (*User, error)
	GetByUsername(username string) (*User, error)
	Create(user *User) error
	Update(user *User) error
	Delete(id int64) error
}

// UserService defines the interface for user business logic
type UserService interface {
	GetByID(id int64) (*User, error)
	GetByEmail(email string) (*User, error)
	Register(user *User) error
	Login(email, password string) (string, error) // Returns JWT token
	UpdateProfile(user *User) error
}
