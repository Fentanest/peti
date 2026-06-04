package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
	"golang.org/x/text/encoding/korean"
	"golang.org/x/text/transform"
)

type FileData struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	Base64 string `json:"base64"`
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SelectDirectory opens a dialog to select the output directory
func (a *App) SelectDirectory() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "저장할 폴더를 선택하세요",
	})
	if err != nil {
		return ""
	}
	return dir
}

// SelectFiles opens a dialog to select multiple text files
func (a *App) SelectFiles() []string {
	files, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "텍스트 파일 선택",
		Filters: []runtime.FileFilter{
			{DisplayName: "Text Files (*.txt)", Pattern: "*.txt"},
		},
	})
	if err != nil {
		return []string{}
	}
	return files
}

// ConvertFiles converts a list of EUC-KR txt files to an Excel file.
func (a *App) ConvertFiles(files []FileData, outputDir string) string {
	if len(files) == 0 {
		return "실패: 선택된 파일이 없습니다."
	}
	if outputDir == "" {
		outputDir = "."
	}

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	sheetName := "Sheet1"
	headers := []string{"순번", "주민등록번호*", "이름", "요청일자", "요청부서", "요청담당자", "연락처"}
	
	// Create a text format style for leading zeros
	style, err := f.NewStyle(&excelize.Style{
		NumFmt: 49, // 49 is @ (text format)
	})
	if err != nil {
		return fmt.Sprintf("스타일 생성 오류: %v", err)
	}

	// Write headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, style)
	}
	// Make headers bold
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	f.SetRowStyle(sheetName, 1, 1, boldStyle)

	currentRow := 2
	totalRows := 0

	for _, fd := range files {
		var contentBytes []byte
		var err error

		if fd.Base64 != "" {
			contentBytes, err = base64.StdEncoding.DecodeString(fd.Base64)
			if err != nil {
				continue
			}
		} else if fd.Path != "" {
			contentBytes, err = os.ReadFile(fd.Path)
			if err != nil {
				continue
			}
		} else {
			continue
		}

		// Decode EUC-KR to UTF-8
		decoder := korean.EUCKR.NewDecoder()
		utf8Content, _, err := transform.Bytes(decoder, contentBytes)
		if err != nil {
			continue
		}

		lines := strings.Split(string(utf8Content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if len(line) > 0 && strings.Contains(line, "|") {
				if !strings.HasSuffix(strings.ToLower(line), ".txt") {
					parts := strings.Split(line, "|")
					for i := 0; i < len(parts) && i < 7; i++ {
						cell, _ := excelize.CoordinatesToCellName(i+1, currentRow)
						f.SetCellValue(sheetName, cell, strings.TrimSpace(parts[i]))
						f.SetCellStyle(sheetName, cell, cell, style)
					}
					currentRow++
					totalRows++
				}
			}
		}
	}

	// Generate filename
	currentTime := time.Now().Format("20060102_150405")
	outputName := filepath.Join(outputDir, fmt.Sprintf("결과_데이터_변환_%s.xlsx", currentTime))

	if err := f.SaveAs(outputName); err != nil {
		return fmt.Sprintf("엑셀 저장 실패: %v", err)
	}

	return fmt.Sprintf("성공: %d행 변환 완료.\n저장 위치: %s", currentRow-2, outputName)
}
