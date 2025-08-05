package container

import "fmt"

type ContainerError struct {
	message string
}

func (e *ContainerError) Error() string {
	return e.message
}

func ErrMissingDependency(dependency string) error {
	return &ContainerError{
		message: fmt.Sprintf("missing required dependency: %s", dependency),
	}
}

func ErrDependencyAlreadySet(dependency string) error {
	return &ContainerError{
		message: fmt.Sprintf("dependency already set: %s", dependency),
	}
}
