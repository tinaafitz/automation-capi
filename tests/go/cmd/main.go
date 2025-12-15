package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/stolostron/automation-capi/tests/pkg/validators"
)

// TestReport contains the overall test results
type TestReport struct {
	Environment   string                        `json:"environment"`
	TestSuite     string                        `json:"test_suite"`
	StartTime     time.Time                     `json:"start_time"`
	EndTime       time.Time                     `json:"end_time"`
	Duration      string                        `json:"duration"`
	TotalTests    int                           `json:"total_tests"`
	PassedTests   int                           `json:"passed_tests"`
	FailedTests   int                           `json:"failed_tests"`
	Results       []validators.ValidationResult `json:"results"`
	Status        string                        `json:"status"`
}

func main() {
	kubeconfigPath := flag.String("kubeconfig", "", "Path to kubeconfig file (defaults to $HOME/.kube/config)")
	outputPath := flag.String("output", "", "Path to save JSON test results (optional)")
	testSuite := flag.String("suite", "capi-installation", "Test suite name")
	environment := flag.String("env", "unknown", "Environment type (minikube, openshift)")

	flag.Parse()

	// Default kubeconfig path
	if *kubeconfigPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting home directory: %v\n", err)
			os.Exit(1)
		}
		*kubeconfigPath = filepath.Join(home, ".kube", "config")
	}

	fmt.Printf("🧪 CAPI/CAPA Test Framework\n")
	fmt.Printf("Environment: %s\n", *environment)
	fmt.Printf("Test Suite: %s\n", *testSuite)
	fmt.Printf("Kubeconfig: %s\n\n", *kubeconfigPath)

	// Create validator
	validator, err := validators.NewCAPIValidator(*kubeconfigPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to create validator: %v\n", err)
		os.Exit(1)
	}

	// Initialize test report
	report := TestReport{
		Environment: *environment,
		TestSuite:   *testSuite,
		StartTime:   time.Now(),
	}

	// Run all validations
	fmt.Println("Running validations...\n")
	results := validator.RunAllValidations()
	report.Results = results
	report.EndTime = time.Now()
	report.Duration = report.EndTime.Sub(report.StartTime).String()
	report.TotalTests = len(results)

	// Print results
	for _, result := range results {
		status := "✅"
		if !result.Passed {
			status = "❌"
			report.FailedTests++
		} else {
			report.PassedTests++
		}
		fmt.Printf("%s %s: %s (duration: %s)\n", status, result.Name, result.Message, result.Duration)
	}

	// Determine overall status
	if report.FailedTests == 0 {
		report.Status = "PASSED"
	} else {
		report.Status = "FAILED"
	}

	// Print summary
	fmt.Printf("\n" + "═"*60 + "\n")
	fmt.Printf("Test Summary\n")
	fmt.Printf("═"*60 + "\n")
	fmt.Printf("Environment:   %s\n", report.Environment)
	fmt.Printf("Test Suite:    %s\n", report.TestSuite)
	fmt.Printf("Total Tests:   %d\n", report.TotalTests)
	fmt.Printf("Passed:        %d\n", report.PassedTests)
	fmt.Printf("Failed:        %d\n", report.FailedTests)
	fmt.Printf("Duration:      %s\n", report.Duration)
	fmt.Printf("Status:        %s\n", report.Status)
	fmt.Printf("═"*60 + "\n")

	// Save results to file if output path specified
	if *outputPath != "" {
		jsonData, err := json.MarshalIndent(report, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Failed to marshal results to JSON: %v\n", err)
			os.Exit(1)
		}

		err = os.WriteFile(*outputPath, jsonData, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Failed to write results to file: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("\n📄 Results saved to: %s\n", *outputPath)
	}

	// Exit with appropriate code
	if report.Status == "FAILED" {
		os.Exit(1)
	}
	os.Exit(0)
}
