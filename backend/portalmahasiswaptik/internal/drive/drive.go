package drive

import (
	"context"
	"fmt"
	"io"
	"io/ioutil"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

type DriveService struct {
	Service *drive.Service
}

func NewDriveService(keyFilePath string) (*DriveService, error) {
	ctx := context.Background()

	// Read key file
	data, err := ioutil.ReadFile(keyFilePath)
	if err != nil {
		return nil, fmt.Errorf("error reading key file: %v", err)
	}

	srv, err := drive.NewService(ctx, option.WithCredentialsJSON(data))
	if err != nil {
		return nil, fmt.Errorf("error creating drive service: %v", err)
	}

	return &DriveService{Service: srv}, nil
}

func (s *DriveService) CreateFolder(name string, parentID string) (string, error) {
	f := &drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentID},
	}

	res, err := s.Service.Files.Create(f).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("error creating folder: %v", err)
	}

	return res.Id, nil
}

func (s *DriveService) UploadFile(name string, mimeType string, reader io.Reader, parentID string) (*drive.File, error) {
	f := &drive.File{
		Name:     name,
		MimeType: mimeType,
	}

	// Only add Parents if parentID is not empty/root
	if parentID != "" && parentID != "root" && parentID != "undefined" {
		f.Parents = []string{parentID}
	}

	res, err := s.Service.Files.Create(f).Media(reader).Fields("id", "name", "mimeType", "webViewLink").Do()
	if err != nil {
		return nil, fmt.Errorf("error uploading file: %v", err)
	}

	// Make the file readable by anyone with the link (optional, but requested for student access)
	_, err = s.Service.Permissions.Create(res.Id, &drive.Permission{
		Type: "anyone",
		Role: "viewer",
	}).Do()
	if err != nil {
		fmt.Printf("Warning: Failed to set permissions for file %s: %v\n", res.Id, err)
	}

	return res, nil
}
