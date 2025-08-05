package graphql

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/Srivathsav-max/lumen/backend/config"
	"github.com/Srivathsav-max/lumen/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/graphql-go/graphql"
)

type Handler struct {
	UserService services.UserService
	Config      *config.Config
	Schema      graphql.Schema
}

func NewHandler(userService services.UserService, cfg *config.Config) (*Handler, error) {
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
					if user, ok := p.Source.(*services.UserResponse); ok {
						return user.FirstName, nil
					}
					return nil, nil
				},
			},
			"lastName": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*services.UserResponse); ok {
						return user.LastName, nil
					}
					return nil, nil
				},
			},
			"createdAt": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*services.UserResponse); ok {
						return user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"), nil
					}
					return nil, nil
				},
			},
			"updatedAt": &graphql.Field{
				Type: graphql.String,
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					if user, ok := p.Source.(*services.UserResponse); ok {
						return user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"), nil
					}
					return nil, nil
				},
			},
		},
	})

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

					user, err := userService.GetByID(p.Context, userID)
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
					userID, exists := p.Context.Value("userID").(int64)
					if !exists {
						return nil, errors.New("user not authenticated")
					}

					user, err := userService.GetByID(p.Context, userID)
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

func (h *Handler) ServeHTTP(c *gin.Context) {
	var params struct {
		Query         string                 `json:"query"`
		OperationName string                 `json:"operationName"`
		Variables     map[string]interface{} `json:"variables"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	ctx := c.Request.Context()
	if userID, exists := c.Get("userID"); exists {
		ctx = context.WithValue(ctx, "userID", userID.(int64))
	}

	result := graphql.Do(graphql.Params{
		Schema:         h.Schema,
		RequestString:  params.Query,
		VariableValues: params.Variables,
		OperationName:  params.OperationName,
		Context:        ctx,
	})

	if len(result.Errors) > 0 {
		c.JSON(http.StatusOK, result)
		return
	}

	c.JSON(http.StatusOK, result)
}

func RegisterHandlers(r *gin.Engine, userService services.UserService, cfg *config.Config) error {
	handler, err := NewHandler(userService, cfg)
	if err != nil {
		return err
	}

	r.POST("/graphql", func(c *gin.Context) {
		handler.ServeHTTP(c)
	})

	if cfg.Server.Env == "development" {
		r.GET("/playground", func(c *gin.Context) {
			c.HTML(http.StatusOK, "playground.html", gin.H{
				"endpoint": "/graphql",
			})
		})

		r.LoadHTMLGlob("graphql/playground.html")
	}

	return nil
}
