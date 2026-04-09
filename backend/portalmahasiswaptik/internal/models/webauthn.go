package models

import (
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// WebAuthnCredential represents a stored biometric credential in the database (FaceID/Fingerprint)
type WebAuthnCredential struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID          uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	CredentialID    []byte    `gorm:"type:bytea;not null;uniqueIndex" json:"credential_id"`
	PublicKey       []byte    `gorm:"type:bytea;not null" json:"public_key"`
	AttestationType string    `gorm:"type:text" json:"attestation_type"`
	AAGUID          uuid.UUID `gorm:"type:uuid" json:"aaguid"`
	SignCount       uint32    `gorm:"default:0" json:"sign_count"`
	CreatedAt       time.Time `gorm:"default:now()" json:"created_at"`
}

func (WebAuthnCredential) TableName() string {
	return "user_credentials"
}

// ToWebAuthn converts our DB model to a webauthn.Credential object
func (c WebAuthnCredential) ToWebAuthn() webauthn.Credential {
	return webauthn.Credential{
		ID:              c.CredentialID,
		PublicKey:       c.PublicKey,
		AttestationType: c.AttestationType,
		Authenticator: webauthn.Authenticator{
			AAGUID:    c.AAGUID[:],
			SignCount: c.SignCount,
		},
	}
}

// WebAuthnUser is a wrapper that implements the webauthn.User interface
type WebAuthnUser struct {
	Profile     Profile
	Credentials []WebAuthnCredential
}

// WebAuthnID returns the unique user ID as bytes
func (u WebAuthnUser) WebAuthnID() []byte {
	return u.Profile.UserID[:]
}

// WebAuthnName returns the user's login name (NIM)
func (u WebAuthnUser) WebAuthnName() string {
	return u.Profile.NIM
}

// WebAuthnDisplayName returns the user's full name
func (u WebAuthnUser) WebAuthnDisplayName() string {
	return u.Profile.FullName
}

// WebAuthnIcon returns the user's avatar URL
func (u WebAuthnUser) WebAuthnIcon() string {
	if u.Profile.AvatarURL != nil {
		return *u.Profile.AvatarURL
	}
	return ""
}

// WebAuthnCredentials returns the list of registered credentials for this user
func (u WebAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	res := make([]webauthn.Credential, len(u.Credentials))
	for i, c := range u.Credentials {
		res[i] = c.ToWebAuthn()
	}
	return res
}
