package storage

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type SupabaseStorage struct {
	URL    string
	Key    string
	Bucket string
}

func NewSupabaseStorage() *SupabaseStorage {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	bucket := "repository"

	return &SupabaseStorage{
		URL:    strings.TrimSuffix(url, "/"),
		Key:    key,
		Bucket: bucket,
	}
}

func (s *SupabaseStorage) UploadFile(fileName string, contentType string, body io.Reader) (string, error) {
	// 1. Prepare Request
	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.URL, s.Bucket, fileName)

	req, err := http.NewRequest("POST", uploadURL, body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.Key)
	req.Header.Set("Content-Type", contentType)
	// req.Header.Set("x-upsert", "true") // Optional: allow overwrite

	// 2. Execute
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("supabase storage error (status %d): %s", resp.StatusCode, string(respBody))
	}

	// 3. Return Public URL
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.URL, s.Bucket, fileName)
	return publicURL, nil
}
