package validators

import (
	"context"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// ValidationResult represents the outcome of a validation check
type ValidationResult struct {
	Name      string    `json:"name"`
	Passed    bool      `json:"passed"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Duration  string    `json:"duration"`
}

// CAPIValidator handles validation of CAPI installations
type CAPIValidator struct {
	clientset *kubernetes.Clientset
	ctx       context.Context
}

// NewCAPIValidator creates a new CAPI validator using kubeconfig
func NewCAPIValidator(kubeconfigPath string) (*CAPIValidator, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build kubeconfig: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	return &CAPIValidator{
		clientset: clientset,
		ctx:       context.Background(),
	}, nil
}

// ValidateCAPISystem checks if CAPI controller manager is running
func (v *CAPIValidator) ValidateCAPISystem() ValidationResult {
	start := time.Now()
	result := ValidationResult{
		Name:      "CAPI Controller Manager",
		Timestamp: start,
	}

	// Check if capi-system namespace exists
	_, err := v.clientset.CoreV1().Namespaces().Get(v.ctx, "capi-system", metav1.GetOptions{})
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("capi-system namespace not found: %v", err)
		result.Duration = time.Since(start).String()
		return result
	}

	// Check if capi-controller-manager deployment exists and is ready
	deployment, err := v.clientset.AppsV1().Deployments("capi-system").Get(
		v.ctx,
		"capi-controller-manager",
		metav1.GetOptions{},
	)
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("capi-controller-manager deployment not found: %v", err)
		result.Duration = time.Since(start).String()
		return result
	}

	if !isDeploymentReady(deployment) {
		result.Passed = false
		result.Message = fmt.Sprintf("capi-controller-manager not ready: %d/%d replicas available",
			deployment.Status.AvailableReplicas,
			deployment.Status.Replicas)
		result.Duration = time.Since(start).String()
		return result
	}

	result.Passed = true
	result.Message = fmt.Sprintf("CAPI controller manager is running (%d/%d replicas ready)",
		deployment.Status.ReadyReplicas,
		deployment.Status.Replicas)
	result.Duration = time.Since(start).String()
	return result
}

// ValidateCAPASystem checks if CAPA controller manager is running
func (v *CAPIValidator) ValidateCAPASystem() ValidationResult {
	start := time.Now()
	result := ValidationResult{
		Name:      "CAPA Controller Manager",
		Timestamp: start,
	}

	// Check if capa-system namespace exists
	_, err := v.clientset.CoreV1().Namespaces().Get(v.ctx, "capa-system", metav1.GetOptions{})
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("capa-system namespace not found: %v", err)
		result.Duration = time.Since(start).String()
		return result
	}

	// Check if capa-controller-manager deployment exists and is ready
	deployment, err := v.clientset.AppsV1().Deployments("capa-system").Get(
		v.ctx,
		"capa-controller-manager",
		metav1.GetOptions{},
	)
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("capa-controller-manager deployment not found: %v", err)
		result.Duration = time.Since(start).String()
		return result
	}

	if !isDeploymentReady(deployment) {
		result.Passed = false
		result.Message = fmt.Sprintf("capa-controller-manager not ready: %d/%d replicas available",
			deployment.Status.AvailableReplicas,
			deployment.Status.Replicas)
		result.Duration = time.Since(start).String()
		return result
	}

	result.Passed = true
	result.Message = fmt.Sprintf("CAPA controller manager is running (%d/%d replicas ready)",
		deployment.Status.ReadyReplicas,
		deployment.Status.Replicas)
	result.Duration = time.Since(start).String()
	return result
}

// ValidateCertManager checks if cert-manager is installed and running
func (v *CAPIValidator) ValidateCertManager() ValidationResult {
	start := time.Now()
	result := ValidationResult{
		Name:      "cert-manager",
		Timestamp: start,
	}

	// Check if cert-manager namespace exists
	_, err := v.clientset.CoreV1().Namespaces().Get(v.ctx, "cert-manager", metav1.GetOptions{})
	if err != nil {
		result.Passed = false
		result.Message = "cert-manager not installed (namespace not found)"
		result.Duration = time.Since(start).String()
		return result
	}

	// Check cert-manager deployments
	deployments := []string{"cert-manager", "cert-manager-webhook", "cert-manager-cainjector"}
	for _, deployName := range deployments {
		deployment, err := v.clientset.AppsV1().Deployments("cert-manager").Get(
			v.ctx,
			deployName,
			metav1.GetOptions{},
		)
		if err != nil {
			result.Passed = false
			result.Message = fmt.Sprintf("%s deployment not found: %v", deployName, err)
			result.Duration = time.Since(start).String()
			return result
		}

		if !isDeploymentReady(deployment) {
			result.Passed = false
			result.Message = fmt.Sprintf("%s not ready: %d/%d replicas available",
				deployName,
				deployment.Status.AvailableReplicas,
				deployment.Status.Replicas)
			result.Duration = time.Since(start).String()
			return result
		}
	}

	result.Passed = true
	result.Message = "cert-manager is running (all components ready)"
	result.Duration = time.Since(start).String()
	return result
}

// ValidateNamespace checks if a specific namespace exists
func (v *CAPIValidator) ValidateNamespace(namespace string) ValidationResult {
	start := time.Now()
	result := ValidationResult{
		Name:      fmt.Sprintf("Namespace: %s", namespace),
		Timestamp: start,
	}

	ns, err := v.clientset.CoreV1().Namespaces().Get(v.ctx, namespace, metav1.GetOptions{})
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("Namespace %s not found: %v", namespace, err)
		result.Duration = time.Since(start).String()
		return result
	}

	if ns.Status.Phase != corev1.NamespaceActive {
		result.Passed = false
		result.Message = fmt.Sprintf("Namespace %s not active (phase: %s)", namespace, ns.Status.Phase)
		result.Duration = time.Since(start).String()
		return result
	}

	result.Passed = true
	result.Message = fmt.Sprintf("Namespace %s exists and is active", namespace)
	result.Duration = time.Since(start).String()
	return result
}

// ValidateSecret checks if a secret exists in a namespace
func (v *CAPIValidator) ValidateSecret(namespace, secretName string) ValidationResult {
	start := time.Now()
	result := ValidationResult{
		Name:      fmt.Sprintf("Secret: %s/%s", namespace, secretName),
		Timestamp: start,
	}

	_, err := v.clientset.CoreV1().Secrets(namespace).Get(v.ctx, secretName, metav1.GetOptions{})
	if err != nil {
		result.Passed = false
		result.Message = fmt.Sprintf("Secret %s not found in namespace %s: %v", secretName, namespace, err)
		result.Duration = time.Since(start).String()
		return result
	}

	result.Passed = true
	result.Message = fmt.Sprintf("Secret %s exists in namespace %s", secretName, namespace)
	result.Duration = time.Since(start).String()
	return result
}

// RunAllValidations runs all validation checks
func (v *CAPIValidator) RunAllValidations() []ValidationResult {
	results := []ValidationResult{}

	// Core validations
	results = append(results, v.ValidateCertManager())
	results = append(results, v.ValidateCAPISystem())
	results = append(results, v.ValidateCAPASystem())
	results = append(results, v.ValidateNamespace("ns-rosa-hcp"))

	return results
}

// Helper function to check if a deployment is ready
func isDeploymentReady(deployment *appsv1.Deployment) bool {
	// Check if desired replicas match available replicas
	if deployment.Status.Replicas == 0 {
		return false
	}

	return deployment.Status.AvailableReplicas == deployment.Status.Replicas &&
		deployment.Status.ReadyReplicas == deployment.Status.Replicas
}
