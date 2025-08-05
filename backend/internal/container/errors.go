package container

import "fmt"

// ContainerError represents dependency injection container errors
type ContainerError struct {
	message string
}

func (e *ContainerError) Error() string {
	return e.message
}

// ErrMissingDependency creates an error for missing dependencies
func ErrMissingDependency(dependency string) error {
	return &ContainerError{
		message: fmt.Sprintf("missing required dependency: %s", dependency),
	}
}

// ErrDependencyAlreadySet creates an error for dependencies that are already set
func ErrDependencyAlreadySet(dependency string) error {
	return &ContainerError{
		message: fmt.Sprintf("dependency already set: %s", dependency),
	}
}