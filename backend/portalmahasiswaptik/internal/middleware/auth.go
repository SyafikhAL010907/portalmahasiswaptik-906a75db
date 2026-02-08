package middleware

import (
	"fmt"
	"os"
	"strings"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserContext contains authenticated user information
type UserContext struct {
	UserID  uuid.UUID
	Email   string
	Role    models.AppRole
	ClassID *uuid.UUID
}

// AuthMiddleware validates Supabase JWT tokens
func AuthMiddleware(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing authorization header",
			})
		}

		// Extract token
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization header format",
			})
		}

		tokenString := tokenParts[1]

		// Parse and validate JWT
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "JWT secret not configured",
			})
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid or expired token",
			})
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid token claims",
			})
		}

		// Get user ID from 'sub' claim
		userIDStr, ok := claims["sub"].(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid user ID in token",
			})
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid user ID format",
			})
		}

		// Get user role from database
		var userRole models.UserRole
		if err := db.Where("user_id = ?", userID).First(&userRole).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "User role not found",
			})
		}

		// Get user profile for class_id
		var profile models.Profile
		db.Where("user_id = ?", userID).First(&profile)

		// Set user context
		userContext := UserContext{
			UserID:  userID,
			Email:   claims["email"].(string),
			Role:    userRole.Role,
			ClassID: profile.ClassID,
		}

		c.Locals("user", userContext)

		return c.Next()
	}
}

// RequireRole creates a middleware that checks for specific roles
func RequireRole(allowedRoles ...models.AppRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(UserContext)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "User not authenticated",
			})
		}

		// Check if user has one of the allowed roles
		for _, role := range allowedRoles {
			if user.Role == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Insufficient permissions",
		})
	}
}

// RequireAdminDev requires admin_dev role
func RequireAdminDev() fiber.Handler {
	return RequireRole(models.RoleAdminDev)
}

// RequireAdmin requires admin_dev or admin_kelas role
func RequireAdmin() fiber.Handler {
	return RequireRole(models.RoleAdminDev, models.RoleAdminKelas)
}

// RequireLecturer requires admin_dosen role
func RequireLecturer() fiber.Handler {
	return RequireRole(models.RoleAdminDev, models.RoleAdminDosen)
}

// ClassScopeMiddleware ensures users can only access their own class data
func ClassScopeMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(UserContext)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "User not authenticated",
			})
		}

		// AdminDev can access all classes
		if user.Role == models.RoleAdminDev {
			return c.Next()
		}

		// Get class_id from request
		requestedClassID := c.Params("classId")
		if requestedClassID == "" {
			requestedClassID = c.Query("class_id")
		}

		// If no specific class requested, continue
		if requestedClassID == "" {
			return c.Next()
		}

		// Parse and validate class ID
		reqClassUUID, err := uuid.Parse(requestedClassID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid class ID format",
			})
		}

		// For AdminKelas, ensure they can only access their own class
		if user.Role == models.RoleAdminKelas {
			if user.ClassID == nil || *user.ClassID != reqClassUUID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"error":   "You can only access your own class data",
				})
			}
		}

		return c.Next()
	}
}
