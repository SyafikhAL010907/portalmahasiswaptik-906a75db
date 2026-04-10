package auth

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/middleware"
	"github.com/SyafikhAL010907/portalmahasiswaptik/backend/internal/models"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WebAuthnHandler struct {
	DB       *gorm.DB
	WebAuthn *webauthn.WebAuthn
	// In-memory session storage (In production, use Redis or DB with TTL)
	sessions      map[string]*webauthn.SessionData
	sessionsMutex sync.RWMutex
}

func NewWebAuthnHandler(db *gorm.DB) (*WebAuthnHandler, error) {
	// RPID should be the domain (e.g., localhost or your-domain.com)
	// We read this from env to support ngrok and production easily
	rpID := os.Getenv("WEBAUTHN_RPID")
	if rpID == "" {
		rpID = "localhost"
	}
	// Sanitize RPID: Remove protocols and trailing slashes
	for _, p := range []string{"https://", "http://"} {
		if idx := len(p); len(rpID) > idx && rpID[:idx] == p {
			rpID = rpID[idx:]
		}
	}
	if len(rpID) > 0 && rpID[len(rpID)-1] == '/' {
		rpID = rpID[:len(rpID)-1]
	}
	fmt.Printf("🛡️ WebAuthn Config: RPID='%s'\n", rpID)

	origin := os.Getenv("WEBAUTHN_ORIGIN")
	if origin == "" {
		origin = "http://localhost:5173"
	}

	w, err := webauthn.New(&webauthn.Config{
		RPID:          rpID,
		RPDisplayName: "Portal Mahasiswa PTIK",
		RPOrigins: []string{
			origin,
			"https://localhost:5173",
			"http://localhost:5173",
			"https://portal-mahasiswa-ptik.vercel.app",
		},
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			ResidentKey:            protocol.ResidentKeyRequirementPreferred,
			UserVerification:       protocol.VerificationPreferred,
		},
	})

	if err != nil {
		return nil, err
	}

	return &WebAuthnHandler{
		DB:       db,
		WebAuthn: w,
		sessions: make(map[string]*webauthn.SessionData),
	}, nil
}

// BeginRegistration starts the biometric registration process
// GET /api/auth/webauthn/register/begin
func (h *WebAuthnHandler) BeginRegistration(c *fiber.Ctx) error {
	// LOCAL RECOVER
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("🔥 PANIC in BeginRegistration: %v\n", r)
			c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Gagal memulai registrasi biometrik (Server Panic)",
			})
		}
	}()

	userCtx, ok := c.Locals("user").(middleware.UserContext)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context missing"})
	}

	fmt.Printf("🚀 Starting Registration for User: %s\n", userCtx.UserID)

	// Fetch profile to get metadata
	var profile models.Profile
	if err := h.DB.Where("user_id = ?", userCtx.UserID).First(&profile).Error; err != nil {
		fmt.Printf("❌ Profile not found for user %s\n", userCtx.UserID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Profile not found"})
	}

	// Fetch existing credentials
	var credentials []models.WebAuthnCredential
	h.DB.Where("user_id = ?", userCtx.UserID).Find(&credentials)

	// LOCKDOWN: Only allow 1 device per user (handled in DB transaction later too)
	if len(credentials) > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Kamu sudah mendaftarkan perangkat biometrik. Satu akun hanya boleh 1 perangkat!",
		})
	}

	waUser := models.WebAuthnUser{
		Profile:     profile,
		Credentials: credentials,
	}

	options, sessionData, err := h.WebAuthn.BeginRegistration(waUser)
	if err != nil {
		fmt.Printf("❌ WebAuthn BeginRegistration Error: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Store session data
	h.sessionsMutex.Lock()
	h.sessions[userCtx.UserID.String()] = sessionData
	h.sessionsMutex.Unlock()

	return c.JSON(options)
}

// FinishRegistration completes the biometric registration process
// POST /api/auth/webauthn/register/finish
func (h *WebAuthnHandler) FinishRegistration(c *fiber.Ctx) error {
	// LOCAL RECOVER: Catch any unexpected panics in this handler to prevent 500 Non-JSON responses
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("🔥 PANIC in FinishRegistration: %v\n", r)
			c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Gagal memproses pendaftaran biometrik (Server Panic)",
				"debug":   fmt.Sprintf("%v", r),
			})
		}
	}()

	userCtx, ok := c.Locals("user").(middleware.UserContext)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context missing"})
	}

	fmt.Printf("🏁 Finishing Registration for User: %s (%s)\n", userCtx.UserID, userCtx.Email)

	// Retrieve session data
	h.sessionsMutex.RLock()
	sessionData, ok := h.sessions[userCtx.UserID.String()]
	h.sessionsMutex.RUnlock()

	if !ok || sessionData == nil {
		fmt.Printf("❌ Session not found or nil for user %s\n", userCtx.UserID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Sesi registrasi tidak ditemukan atau sudah kadaluarsa. Silakan coba lagi dari awal."})
	}

	// Fetch profile
	var profile models.Profile
	if err := h.DB.Where("user_id = ?", userCtx.UserID).First(&profile).Error; err != nil {
		fmt.Printf("❌ Profile not found for user %s\n", userCtx.UserID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Profil pengguna tidak ditemukan"})
	}

	waUser := models.WebAuthnUser{Profile: profile}

	// Convert Fiber request to *http.Request for the library (Proper Emulation)
	req, _ := http.NewRequest(c.Method(), c.Path(), bytes.NewReader(c.Body()))
	req.Header.Set("Content-Type", c.Get("Content-Type"))
	req.Header.Set("Origin", c.Get("Origin"))
	
	// CRITICAL: Host MUST match RPID for validation to succeed
	req.Host = h.WebAuthn.Config.RPID

	// Parse response from client
	credential, err := h.WebAuthn.FinishRegistration(waUser, *sessionData, req)
	if err != nil {
		fmt.Printf("❌ WebAuthn Registration Verify Error: %v | User: %s | Host: %s\n", err, profile.NIM, req.Host)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Verifikasi biometrik gagal: " + err.Error(),
		})
	}

	// Save to Database
	var aaguid uuid.UUID
	if len(credential.Authenticator.AAGUID) == 16 {
		aaguid, _ = uuid.FromBytes(credential.Authenticator.AAGUID)
	}

	newCred := models.WebAuthnCredential{
		UserID:          userCtx.UserID,
		CredentialID:    credential.ID,
		PublicKey:       credential.PublicKey,
		AttestationType: credential.AttestationType,
		AAGUID:          aaguid,
		SignCount:       credential.Authenticator.SignCount,
	}

	// Use Transaction for safety
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete any existing credential for this user (One device policy)
		tx.Where("user_id = ?", userCtx.UserID).Delete(&models.WebAuthnCredential{})
		
		// Create new one
		if err := tx.Create(&newCred).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		fmt.Printf("❌ DB Save Error: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Gagal menyimpan data biometrik ke database: " + err.Error(),
		})
	}

	// Cleanup session
	h.sessionsMutex.Lock()
	delete(h.sessions, userCtx.UserID.String())
	h.sessionsMutex.Unlock()

	fmt.Printf("✅ Biometrik berhasil didaftarkan untuk: %s\n", profile.NIM)
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Biometrik berhasil didaftarkan! Sekarang lo bisa login sat-set pake sidik jari/muka.",
	})
}

// BeginLogin starts the biometric authentication process
// POST /api/auth/webauthn/login/begin
func (h *WebAuthnHandler) BeginLogin(c *fiber.Ctx) error {
	// LOCAL RECOVER
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("🔥 PANIC in BeginLogin: %v\n", r)
			c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Gagal memulai login biometrik (Server Panic)",
			})
		}
	}()

	var userID uuid.UUID
	var nim string

	// 1. Try to get user from context (2FA flow)
	if u, ok := c.Locals("user").(middleware.UserContext); ok {
		userID = u.UserID
	} else {
		// 2. Try to get NIM from request body (Login flow)
		var body struct {
			NIM string `json:"nim"`
		}
		if err := c.BodyParser(&body); err != nil || body.NIM == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Masukan NIM kamu untuk login biometrik"})
		}
		nim = body.NIM
	}

	// Fetch profile
	var profile models.Profile
	query := h.DB
	if userID != uuid.Nil {
		query = query.Where("user_id = ?", userID)
	} else {
		query = query.Where("nim = ?", nim)
	}

	if err := query.First(&profile).Error; err != nil {
		fmt.Printf("❌ login profile not found: %s / %s\n", nim, userID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Data biometrik tidak ditemukan untuk NIM ini. Pastikan kamu sudah mendaftarkannya di Profile."})
	}

	// Fetch existing credentials
	var credentials []models.WebAuthnCredential
	h.DB.Where("user_id = ?", profile.UserID).Find(&credentials)

	if len(credentials) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Belum ada sidik jari/wajah yang didaftarkan untuk akun ini."})
	}

	waUser := models.WebAuthnUser{
		Profile:     profile,
		Credentials: credentials,
	}

	options, sessionData, err := h.WebAuthn.BeginLogin(waUser)
	if err != nil {
		fmt.Printf("❌ WebAuthn BeginLogin Error: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal inisialisasi login biometrik: " + err.Error()})
	}

	// Store session data using the profile's UserID (works for both flows)
	h.sessionsMutex.Lock()
	h.sessions[profile.UserID.String()] = sessionData
	h.sessionsMutex.Unlock()

	fmt.Printf("🚀 Login Biometrik dimulai untuk User: %s (%s)\n", profile.NIM, profile.UserID)
	return c.JSON(options)
}

// FinishLogin completes the biometric authentication process
// POST /api/auth/webauthn/login/finish
func (h *WebAuthnHandler) FinishLogin(c *fiber.Ctx) error {
	// LOCAL RECOVER
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("🔥 PANIC in FinishLogin: %v\n", r)
			c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Gagal memproses login biometrik (Server Panic)",
			})
		}
	}()

	// Parse body to get user identity or session reference
	var loginBody struct {
		NIM string `json:"nim"`
	}
	c.BodyParser(&loginBody)

	var userID uuid.UUID
	var userEmail string
	if u, ok := c.Locals("user").(middleware.UserContext); ok {
		userID = u.UserID
		userEmail = u.Email
	}

	// If unauthenticated, we need to find the user via NIM to recover the session
	if userID == uuid.Nil {
		var profile models.Profile
		if err := h.DB.Where("nim = ?", loginBody.NIM).First(&profile).Error; err != nil {
			fmt.Printf("❌ login profile not found for finish: %s\n", loginBody.NIM)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User tidak ditemukan"})
		}
		userID = profile.UserID
	}

	// Retrieve session data
	h.sessionsMutex.RLock()
	sessionData, ok := h.sessions[userID.String()]
	h.sessionsMutex.RUnlock()

	if !ok || sessionData == nil {
		fmt.Printf("❌ login session not found for user: %s\n", userID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Sesi login tidak ditemukan atau sudah kadaluarsa. Silakan coba lagi."})
	}

	// Fetch profile for user metadata
	var profile models.Profile
	if err := h.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		fmt.Printf("❌ profile not found for user: %v\n", userID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Profil pengguna tidak ditemukan"})
	}
	if userEmail == "" {
		userEmail = profile.NIM + "@student.ptik.unj.ac.id"
	}

	// Fetch all user credentials to check against
	var credentials []models.WebAuthnCredential
	h.DB.Where("user_id = ?", userID).Find(&credentials)

	waUser := models.WebAuthnUser{
		Profile:     profile,
		Credentials: credentials,
	}

	// Convert Fiber request to *http.Request (Proper Emulation)
	req, _ := http.NewRequest(c.Method(), c.Path(), bytes.NewReader(c.Body()))
	req.Header.Set("Content-Type", c.Get("Content-Type"))
	req.Header.Set("Origin", c.Get("Origin"))
	
	// CRITICAL: Host MUST match RPID for validation to succeed
	req.Host = h.WebAuthn.Config.RPID

	credential, err := h.WebAuthn.FinishLogin(waUser, *sessionData, req)
	if err != nil {
		fmt.Printf("❌ WebAuthn Login Verify Error: %v | User: %s | Host: %s\n", err, profile.NIM, req.Host)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Verifikasi biometrik gagal: " + err.Error(),
		})
	}

	// Update sign count in DB
	h.DB.Model(&models.WebAuthnCredential{}).
		Where("credential_id = ?", credential.ID).
		Update("sign_count", credential.Authenticator.SignCount)

	// CLEANUP SESSION
	h.sessionsMutex.Lock()
	delete(h.sessions, userID.String())
	h.sessionsMutex.Unlock()

	// GENERATE SUPABASE COMPATIBLE JWT FOR PASSWORDLESS LOGIN
	secret := os.Getenv("SUPABASE_JWT_SECRET")
	if secret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Konfigurasi JWT Secret (Backend) belum diatur"})
	}

	// Sign token with standard Supabase claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   userID.String(),
		"email": userEmail,
		"role":  "authenticated", // Crucial for Supabase RLS
		"aud":   "authenticated",
		"iat":   jwt.NewNumericDate(time.Now()),
		"exp":   jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 7)), // 1 week session
		"app_metadata": map[string]interface{}{
			"provider": "webauthn",
			"providers": []string{"webauthn"},
		},
		"user_metadata": map[string]interface{}{
			"full_name": profile.FullName,
		},
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Printf("❌ JWT Encode Error: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat akses login"})
	}

	fmt.Printf("✅ Login Biometrik BERHASIL untuk: %s\n", profile.NIM)
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Login biometrik berhasil!",
		"token":   tokenString,
		"user":    profile,
	})
}

// GetStatus checks if the user has any registered biometric credentials
// GET /api/auth/webauthn/status
func (h *WebAuthnHandler) GetStatus(c *fiber.Ctx) error {
	userCtx, ok := c.Locals("user").(middleware.UserContext)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context missing"})
	}

	var count int64
	h.DB.Model(&models.WebAuthnCredential{}).Where("user_id = ?", userCtx.UserID).Count(&count)

	return c.JSON(fiber.Map{
		"is_registered": count > 0,
	})
}

// DeleteCredential removes the user's biometric registration
// DELETE /api/auth/webauthn/delete
func (h *WebAuthnHandler) DeleteCredential(c *fiber.Ctx) error {
	userCtx, ok := c.Locals("user").(middleware.UserContext)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User context missing"})
	}

	// Delete all credentials associated with the user_id (One Device Only logic)
	result := h.DB.Where("user_id = ?", userCtx.UserID).Delete(&models.WebAuthnCredential{})
	if result.Error != nil {
		fmt.Printf("❌ Delete Credential Error: %v\n", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghapus data biometrik: " + result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Biometrik berhasil dihapus!",
	})
}
