package graphql

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/models"
	"github.com/gin-gonic/gin"
	"github.com/graphql-go/graphql"
)

// Handler is the GraphQL handler
type Handler struct {
	UserService models.UserService
	Config      *config.Config
	Schema      graphql.Schema
}

// NewHandler creates a new GraphQL handler
func NewHandler(userService models.UserService, cfg *config.Config) (*Handler, error) {
	// Define User type
	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"id": &graphql.Field{
				Type: graphql.ID,
			},
			"username": &graphql.Field{
				Type: graphql.String,
			},
			"email": &graphql.Field{
				Type: graphql.String,
			},
			"firstName": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*models.User); ok {
						return user.FirstName, nil
					}
					return nil, nil
				},
			},
			"lastName": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*models.User); ok {
						return user.LastName, nil
					}
					return nil, nil
				},
			},
			"createdAt": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*models.User); ok {
						return user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"), nil
					}
					return nil, nil
				},
			},
			"updatedAt": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*models.User); ok {
						return user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"), nil
					}
					return nil, nil
				},
			},
		},
	})

	// Define query
	queryType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"user": &graphql.Field{
				Type: userType,
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{
						Type: graphql.NewNonNull(graphql.ID),
					},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					id, ok := p.Args["id"].(string)
					if !ok {
						return nil, errors.New("invalid id")
					}

					userID, err := strconv.ParseInt(id, 10, 64)
					if err != nil {
						return nil, errors.New("invalid user ID format")
					}

					user, err := userService.GetByID(userID)
					if err != nil {
						return nil, err
					}

					if user == nil {
						return nil, errors.New("user not found")
					}

					return user, nil
				},
			},
			"me": &graphql.Field{
				Type: userType,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					// Get user ID from context
					userID, ok := p.Context.Value("userID").(int64)
					if !ok {
						return nil, errors.New("not authenticated")
					}

					user, err := userService.GetByID(userID)
					if err != nil {
						return nil, err
					}

					if user == nil {
						return nil, errors.New("user not found")
					}

					return user, nil
				},
			},
		},
	})

	// Create schema
	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query: queryType,
	})
	if err != nil {
		return nil, err
	}

	return &Handler{
		UserService: userService,
		Config:      cfg,
		Schema:      schema,
	}, nil
}

// ServeHTTP handles GraphQL requests
func (h *Handler) ServeHTTP(c *gin.Context) {
	// Parse request
	var params struct {
		Query         string                 `json:"query"`
		OperationName string                 `json:"operationName"`
		Variables     map[string]interface{} `json:"variables"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Create context with user ID if authenticated
	ctx := c.Request.Context()
	if userID, exists := c.Get("userID"); exists {
		ctx = context.WithValue(ctx, "userID", userID.(int64))
	}

	// Execute query
	result := graphql.Do(graphql.Params{
		Schema:         h.Schema,
		RequestString:  params.Query,
		VariableValues: params.Variables,
		OperationName:  params.OperationName,
		Context:        ctx,
	})

	// Handle errors
	if len(result.Errors) > 0 {
		c.JSON(http.StatusOK, result)
		return
	}

	// Return result
	c.JSON(http.StatusOK, result)
}

// RegisterHandlers registers GraphQL handlers with the Gin router
func RegisterHandlers(r *gin.Engine, userService models.UserService, cfg *config.Config) error {
	// Create GraphQL handler
	handler, err := NewHandler(userService, cfg)
	if err != nil {
		return err
	}

	// Register GraphQL endpoint
	r.POST("/graphql", func(c *gin.Context) {
		handler.ServeHTTP(c)
	})

	// Register GraphQL playground in development mode
	if cfg.Server.Env == "development" {
		r.GET("/playground", func(c *gin.Context) {
			c.HTML(http.StatusOK, "playground.html", gin.H{
				"endpoint": "/graphql",
			})
		})

		// Serve playground HTML
		r.LoadHTMLGlob("graphql/playground.html")
	}

	return nil
}
