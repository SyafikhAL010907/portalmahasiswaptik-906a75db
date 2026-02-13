package models

import (
	"time"

	"github.com/google/uuid"
)

// AppRole represents the role enum type
type AppRole string

const (
	RoleAdminDev   AppRole = "admin_dev"
	RoleAdminKelas AppRole = "admin_kelas"
	RoleAdminDosen AppRole = "admin_dosen"
	RoleMahasiswa  AppRole = "mahasiswa"
)

// Class represents a student class (A, B, C)
type Class struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"type:text;not null" json:"name"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`
}

func (Class) TableName() string {
	return "classes"
}

// Profile represents user profile data
type Profile struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	NIM       string     `gorm:"type:text;not null" json:"nim"`
	FullName  string     `gorm:"type:text;not null" json:"full_name"`
	AvatarURL *string    `gorm:"type:text" json:"avatar_url,omitempty"`
	ClassID   *uuid.UUID `gorm:"type:uuid" json:"class_id,omitempty"`
	CreatedAt time.Time  `gorm:"default:now()" json:"created_at"`
	UpdatedAt time.Time  `gorm:"default:now()" json:"updated_at"`

	// Relations
	Class *Class `gorm:"foreignKey:ClassID" json:"class,omitempty"`
}

func (Profile) TableName() string {
	return "profiles"
}

// UserRole represents user role assignment
type UserRole struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Role      AppRole   `gorm:"type:app_role;not null" json:"role"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`
}

func (UserRole) TableName() string {
	return "user_roles"
}

// Subject represents academic subjects
type Subject struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code      string    `gorm:"type:text;not null" json:"code"`
	Name      string    `gorm:"type:text;not null" json:"name"`
	Semester  int       `gorm:"not null" json:"semester"`
	SKS       int       `gorm:"default:3" json:"sks"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`

	// Relations
	Meetings []Meeting `gorm:"foreignKey:SubjectID" json:"meetings,omitempty"`
}

func (Subject) TableName() string {
	return "subjects"
}

// Meeting represents meeting sessions per subject
type Meeting struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SubjectID     uuid.UUID `gorm:"type:uuid;not null" json:"subject_id"`
	MeetingNumber int       `gorm:"not null" json:"meeting_number"`
	Topic         *string   `gorm:"type:text" json:"topic,omitempty"`
	CreatedAt     time.Time `gorm:"default:now()" json:"created_at"`

	// Relations
	Subject *Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

func (Meeting) TableName() string {
	return "meetings"
}

// AttendanceSession represents QR code sessions for attendance
type AttendanceSession struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ClassID    uuid.UUID `gorm:"type:uuid;not null" json:"class_id"`
	LecturerID uuid.UUID `gorm:"type:uuid;not null" json:"lecturer_id"`
	MeetingID  uuid.UUID `gorm:"type:uuid;not null" json:"meeting_id"`
	QRCode     string    `gorm:"type:text;not null" json:"qr_code"`
	IsActive   *bool     `gorm:"default:true" json:"is_active"`
	ExpiresAt  time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt  time.Time `gorm:"default:now()" json:"created_at"`

	// Relations
	Class   *Class   `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	Meeting *Meeting `gorm:"foreignKey:MeetingID" json:"meeting,omitempty"`
}

func (AttendanceSession) TableName() string {
	return "attendance_sessions"
}

// AttendanceRecord represents student attendance records
type AttendanceRecord struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SessionID uuid.UUID `gorm:"type:uuid;not null" json:"session_id"`
	StudentID uuid.UUID `gorm:"type:uuid;not null" json:"student_id"`
	Status    string    `gorm:"type:text;default:'present'" json:"status"`
	Method    string    `gorm:"type:text;default:'qr'" json:"method"`
	ScannedAt time.Time `gorm:"default:now()" json:"scanned_at"`

	// Relations
	Session *AttendanceSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
}

func (AttendanceRecord) TableName() string {
	return "attendance_records"
}

// Transaction represents financial transactions
type Transaction struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ClassID         *uuid.UUID `gorm:"type:uuid" json:"class_id,omitempty"` // Nullable: for class-specific or batch-wide
	CreatedBy       uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
	Type            string     `gorm:"type:text;not null" json:"type"` // income or expense
	Category        string     `gorm:"type:text;not null" json:"category"`
	Amount          float64    `gorm:"type:numeric;not null" json:"amount"`
	Description     *string    `gorm:"type:text" json:"description,omitempty"`
	ProofURL        *string    `gorm:"type:text" json:"proof_url,omitempty"`
	TransactionDate time.Time  `gorm:"type:date;default:CURRENT_DATE" json:"transaction_date"`
	CreatedAt       time.Time  `gorm:"default:now()" json:"created_at"`

	// Relations
	Class *Class `gorm:"foreignKey:ClassID" json:"class,omitempty"`
}

func (Transaction) TableName() string {
	return "transactions"
}

// WeeklyDue represents weekly student dues/payments
type WeeklyDue struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	StudentID  uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_weekly_due_unique" json:"student_id"`
	WeekNumber int        `gorm:"not null;uniqueIndex:idx_weekly_due_unique" json:"week_number"`
	Month      int        `gorm:"default:extract(month from CURRENT_DATE);uniqueIndex:idx_weekly_due_unique" json:"month"`
	Year       int        `gorm:"default:extract(year from CURRENT_DATE);uniqueIndex:idx_weekly_due_unique" json:"year"`
	Amount     float64    `gorm:"type:numeric;default:5000" json:"amount"`
	Status     string     `gorm:"type:text;default:'unpaid'" json:"status"` // unpaid, pending, paid
	ProofURL   *string    `gorm:"type:text" json:"proof_url,omitempty"`
	PaidAt     *time.Time `gorm:"type:timestamptz" json:"paid_at,omitempty"`
	VerifiedBy *uuid.UUID `gorm:"type:uuid" json:"verified_by,omitempty"`
	CreatedAt  time.Time  `gorm:"default:now()" json:"created_at"`
}

func (WeeklyDue) TableName() string {
	return "weekly_dues"
}

// Announcement represents system announcements
type Announcement struct {
	ID            uuid.UUID   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title         string      `gorm:"type:text;not null" json:"title"`
	Content       string      `gorm:"type:text;not null" json:"content"`
	Category      string      `gorm:"type:text;default:'general'" json:"category"`
	IsPinned      *bool       `gorm:"default:false" json:"is_pinned"`
	TargetClasses []uuid.UUID `gorm:"type:uuid[]" json:"target_classes,omitempty"`
	CreatedBy     uuid.UUID   `gorm:"type:uuid;not null" json:"created_by"`
	ExpiresAt     *time.Time  `gorm:"type:timestamptz" json:"expires_at,omitempty"`
	CreatedAt     time.Time   `gorm:"default:now()" json:"created_at"`
}

func (Announcement) TableName() string {
	return "announcements"
}

// Material represents repository materials
type Material struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SubjectID   uuid.UUID `gorm:"type:uuid;not null" json:"subject_id"`
	Title       string    `gorm:"type:text;not null" json:"title"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	FileURL     string    `gorm:"type:text;not null" json:"file_url"`
	FileType    string    `gorm:"type:text;not null" json:"file_type"` // pdf, video, image
	FileSize    *int      `gorm:"type:integer" json:"file_size,omitempty"`
	Semester    int       `gorm:"not null" json:"semester"`
	UploadedBy  uuid.UUID `gorm:"type:uuid;not null" json:"uploaded_by"`
	CreatedAt   time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"default:now()" json:"updated_at"`

	// Relations
	Subject *Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

func (Material) TableName() string {
	return "materials"
}
