package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	jwksCache map[string]*ecdsa.PublicKey
	jwksMutex sync.RWMutex
)

// getPublicKey fetches or retrieves from cache the public key for a given kid
func getPublicKey(kid string) (*ecdsa.PublicKey, error) {
	jwksMutex.RLock()
	if pubKey, ok := jwksCache[kid]; ok {
		jwksMutex.RUnlock()
		return pubKey, nil
	}
	jwksMutex.RUnlock()

	jwksMutex.Lock()
	defer jwksMutex.Unlock()

	// Double check after acquiring lock
	if pubKey, ok := jwksCache[kid]; ok {
		return pubKey, nil
	}

	// Fetch JWKS from Supabase
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = "https://owqjsqvpmsctztpgensg.supabase.co"
	}
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", strings.TrimSuffix(supabaseURL, "/"))

	resp, err := http.Get(jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %v", err)
	}
	defer resp.Body.Close()

	var jwks struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			X   string `json:"x"`
			Y   string `json:"y"`
		} `json:"keys"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("failed to decode JWKS: %v", err)
	}

	if jwksCache == nil {
		jwksCache = make(map[string]*ecdsa.PublicKey)
	}

	for _, key := range jwks.Keys {
		if key.Kty == "EC" {
			xBytes, err := base64.RawURLEncoding.DecodeString(key.X)
			if err != nil {
				continue
			}
			yBytes, err := base64.RawURLEncoding.DecodeString(key.Y)
			if err != nil {
				continue
			}

			pubKey := &ecdsa.PublicKey{
				Curve: elliptic.P256(),
				X:     new(big.Int).SetBytes(xBytes),
				Y:     new(big.Int).SetBytes(yBytes),
			}
			jwksCache[key.Kid] = pubKey
		}
	}

	pubKey, ok := jwksCache[kid]
	if !ok {
		return nil, fmt.Errorf("kid not found in JWKS: %s", kid)
	}

	return pubKey, nil
}

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

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization header format",
			})
		}

		// Parse and validate JWT using JWKS and ES256
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Ensure the signing method is ES256 (ECDSA)
			if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			// Get kid from header
			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing kid in token header")
			}

			// Match with user's specific kid if necessary, but discovery is better
			return getPublicKey(kid)
		})

		if err != nil || !token.Valid {
			fmt.Printf("❌ JWT Error: %v\n", err) // INI PENTING BUAT DEBUG
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

		// BYPASS: Temporarily hardcode role to admin_dev due to PgBouncer SQLSTATE 42P05 errors
		fmt.Printf("⚠️  BYPASS AKTIF: User %s dipaksa jadi admin_dev\n", userID)

		/*
			// Get user role from database (TEMPORARILY DISABLED)
			var userRole models.UserRole
			fmt.Printf("🔍 Mencari Role untuk User ID: %s\n", userID)
			if err := db.Where("user_id = ?", userID).First(&userRole).Error; err != nil {
				fmt.Printf("❌ Role tidak ditemukan untuk User ID: %s. Error: %v\n", userID, err)
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"error":   "User role not found",
				})
			}
			fmt.Printf("✅ ROLE DITEMUKAN: %s untuk User ID: %s\n", userRole.Role, userID)

			// Get user profile for class_id
			var profile models.Profile
			db.Where("user_id = ?", userID).First(&profile)
		*/

		// Set user context with hardcoded admin_dev role
		userContext := UserContext{
			UserID:  userID,
			Email:   claims["email"].(string),
			Role:    models.RoleAdminDev, // FORCED ROLE
			ClassID: nil,                 // AdminDev doesn't need class_id
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

// RequireAdminDev requires admin_dev or plain dev role
func RequireAdminDev() fiber.Handler {
	return RequireRole(models.RoleAdminDev, models.AppRole("dev"))
}

// RequireAdmin requires admin_dev, admin_kelas, admin, or admin_angkatan roles
func RequireAdmin() fiber.Handler {
	return RequireRole(
		models.RoleAdminDev,
		models.RoleAdminKelas,
		models.AppRole("admin"),
		models.AppRole("admin_dev"),
		models.AppRole("admin_kelas"),
	)
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
