package admin

import (
	"os"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{DB: db}
}

// UserResponse represents user data for API response
type UserResponse struct {
	ID        uuid.UUID      `json:"id"`
	UserID    uuid.UUID      `json:"user_id"`
	NIM       string         `json:"nim"`
	FullName  string         `json:"full_name"`
	AvatarURL *string        `json:"avatar_url,omitempty"`
	ClassID   *uuid.UUID     `json:"class_id,omitempty"`
	ClassName *string        `json:"class_name,omitempty"`
	Role      models.AppRole `json:"role"`
	CreatedAt string         `json:"created_at"`
}

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
	NIM      string         `json:"nim" validate:"required"`
	FullName string         `json:"full_name" validate:"required"`
	Password string         `json:"password" validate:"required,min=8"`
	Role     models.AppRole `json:"role" validate:"required"`
	ClassID  *uuid.UUID     `json:"class_id"`
}

// GetUsers returns list of users with filters
// GET /api/users
func (h *UserHandler) GetUsers(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	// Only admins can list users
	if user.Role != models.RoleAdminDev && user.Role != models.RoleAdminKelas {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied",
		})
	}

	// Pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	offset := (page - 1) * limit

	// Build query
	query := h.DB.Model(&models.Profile{}).
		Select("profiles.*, user_roles.role, classes.name as class_name").
		Joins("LEFT JOIN user_roles ON user_roles.user_id = profiles.user_id").
		Joins("LEFT JOIN classes ON classes.id = profiles.class_id")

	// AdminKelas can only see their own class
	if user.Role == models.RoleAdminKelas && user.ClassID != nil {
		query = query.Where("profiles.class_id = ?", *user.ClassID)
	}

	// Optional filters
	if role := c.Query("role"); role != "" {
		query = query.Where("user_roles.role = ?", role)
	}
	if classID := c.Query("class_id"); classID != "" {
		query = query.Where("profiles.class_id = ?", classID)
	}
	if search := c.Query("search"); search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("profiles.full_name ILIKE ? OR profiles.nim ILIKE ?", searchPattern, searchPattern)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get paginated results
	type ProfileWithRole struct {
		models.Profile
		Role      models.AppRole `gorm:"column:role"`
		ClassName *string        `gorm:"column:class_name"`
	}

	var profiles []ProfileWithRole
	query.Order("profiles.full_name ASC").
		Offset(offset).
		Limit(limit).
		Scan(&profiles)

	// Convert to response format
	users := make([]UserResponse, len(profiles))
	for i, p := range profiles {
		users[i] = UserResponse{
			ID:        p.ID,
			UserID:    p.UserID,
			NIM:       p.NIM,
			FullName:  p.FullName,
			AvatarURL: p.AvatarURL,
			ClassID:   p.ClassID,
			ClassName: p.ClassName,
			Role:      p.Role,
			CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    users,
		"meta": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetUserByID returns a single user
// GET /api/users/:id
func (h *UserHandler) GetUserByID(c *fiber.Ctx) error {
	userIDParam := c.Params("id")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	var profile models.Profile
	if err := h.DB.Preload("Class").Where("user_id = ?", userID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"error":   "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch user",
		})
	}

	var userRole models.UserRole
	h.DB.Where("user_id = ?", userID).First(&userRole)

	return c.JSON(fiber.Map{
		"success": true,
		"data": UserResponse{
			ID:        profile.ID,
			UserID:    profile.UserID,
			NIM:       profile.NIM,
			FullName:  profile.FullName,
			AvatarURL: profile.AvatarURL,
			ClassID:   profile.ClassID,
			Role:      userRole.Role,
			CreatedAt: profile.CreatedAt.Format("2006-01-02T15:04:05Z"),
		},
	})
}

// CreateUser creates a new user (AdminDev only)
// POST /api/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	currentUser := c.Locals("user").(middleware.UserContext)

	// Only AdminDev can create users
	if currentUser.Role != models.RoleAdminDev {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Only Super Admin can create users",
		})
	}

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Validate required fields
	if req.NIM == "" || req.FullName == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "NIM, full_name, and password are required",
		})
	}

	// Check if NIM already exists
	var existingProfile models.Profile
	if err := h.DB.Where("nim = ?", req.NIM).First(&existingProfile).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "NIM already registered",
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to process password",
		})
	}

	// Note: In production, you would use Supabase Admin API to create auth.users
	// This is a simplified example - the actual user creation should go through Supabase
	// For now, we'll return the hashed password info for manual creation

	_ = hashedPassword // Password hashed, ready for Supabase Admin API

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "User creation initiated. Use Supabase Admin API to complete.",
		"data": fiber.Map{
			"nim":       req.NIM,
			"email":     req.NIM + "@ptik.local",
			"full_name": req.FullName,
			"role":      req.Role,
			"class_id":  req.ClassID,
		},
		"note": "Complete user creation via Supabase Admin API or Edge Function",
	})
}

// UpdateUser updates user profile
// PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	currentUser := c.Locals("user").(middleware.UserContext)
	userIDParam := c.Params("id")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Only AdminDev can update other users, or users can update themselves
	if currentUser.Role != models.RoleAdminDev && currentUser.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Access denied",
		})
	}

	type UpdateUserRequest struct {
		FullName  *string         `json:"full_name"`
		AvatarURL *string         `json:"avatar_url"`
		ClassID   *uuid.UUID      `json:"class_id"`
		Role      *models.AppRole `json:"role"`
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Find profile
	var profile models.Profile
	if err := h.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "User not found",
		})
	}

	// Update profile fields
	updates := make(map[string]interface{})
	if req.FullName != nil {
		updates["full_name"] = *req.FullName
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.ClassID != nil && currentUser.Role == models.RoleAdminDev {
		updates["class_id"] = *req.ClassID
	}

	if len(updates) > 0 {
		h.DB.Model(&profile).Updates(updates)
	}

	// Update role (AdminDev only)
	if req.Role != nil && currentUser.Role == models.RoleAdminDev {
		h.DB.Model(&models.UserRole{}).Where("user_id = ?", userID).Update("role", *req.Role)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User updated successfully",
	})
}

// DeleteUser deletes a user (AdminDev only)
// DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	currentUser := c.Locals("user").(middleware.UserContext)

	// Only AdminDev can delete users
	if currentUser.Role != models.RoleAdminDev {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Only Super Admin can delete users",
		})
	}

	userIDParam := c.Params("id")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Prevent self-deletion
	if currentUser.UserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Cannot delete your own account",
		})
	}

	// Note: In production, also delete from auth.users via Supabase Admin API
	// Delete profile and role
	h.DB.Where("user_id = ?", userID).Delete(&models.UserRole{})
	h.DB.Where("user_id = ?", userID).Delete(&models.Profile{})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User deleted successfully. Remember to also delete from Supabase Auth.",
	})
}

// GetClasses returns all classes
// GET /api/classes
func (h *UserHandler) GetClasses(c *fiber.Ctx) error {
	var classes []models.Class
	h.DB.Order("name ASC").Find(&classes)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    classes,
	})
}

// GetProfile returns the current user's profile
// GET /api/profile
func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	user := c.Locals("user").(middleware.UserContext)

	var profile models.Profile
	if err := h.DB.Preload("Class").Where("user_id = ?", user.UserID).First(&profile).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Profile not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"profile": profile,
			"role":    user.Role,
		},
	})
}

// GetSupabaseConfig returns public Supabase configuration
// GET /api/config
func (h *UserHandler) GetSupabaseConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"supabase_url":      os.Getenv("SUPABASE_URL"),
			"supabase_anon_key": os.Getenv("SUPABASE_ANON_KEY"),
		},
	})
}

// SyncUser synchronizes user data from Supabase Auth hook or client
// POST /api/auth/sync
func (h *UserHandler) SyncUser(c *fiber.Ctx) error {
	type SyncRequest struct {
		UserID    uuid.UUID `json:"user_id"`
		Email     string    `json:"email"`
		FullName  string    `json:"full_name"`
		AvatarURL string    `json:"avatar_url"`
	}

	var req SyncRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// 1. Ensure User Role exists
	var userRole models.UserRole
	if err := h.DB.Where("user_id = ?", req.UserID).First(&userRole).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Default role: Mahasiswa
			userRole = models.UserRole{
				ID:     uuid.New(),
				UserID: req.UserID,
				Role:   models.RoleMahasiswa,
			}
			h.DB.Create(&userRole)
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error checking role"})
		}
	}

	// 2. Ensure Profile exists or update it
	var profile models.Profile
	if err := h.DB.Where("user_id = ?", req.UserID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new profile
			profile = models.Profile{
				ID:        uuid.New(),
				UserID:    req.UserID,
				FullName:  req.FullName,
				NIM:       "", // NIM needs to be set manually or via another flow
				AvatarURL: &req.AvatarURL,
			}
			if err := h.DB.Create(&profile).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create profile"})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error checking profile"})
		}
	} else {
		// Update existing profile if needed
		updates := map[string]interface{}{}
		if req.FullName != "" && profile.FullName != req.FullName {
			updates["full_name"] = req.FullName
		}
		if req.AvatarURL != "" && (profile.AvatarURL == nil || *profile.AvatarURL != req.AvatarURL) {
			updates["avatar_url"] = req.AvatarURL
		}
		if len(updates) > 0 {
			h.DB.Model(&profile).Updates(updates)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User synced successfully",
		"data": fiber.Map{
			"role": userRole.Role,
		},
	})
}
