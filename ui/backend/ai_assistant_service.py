"""
AI Assistant Service for ROSA Cluster Management
Integrates with Claude API to provide intelligent assistance
"""
import os
import anthropic
from typing import List, Dict, Any


class AIAssistantService:
    def __init__(self):
        # Use Anthropic API key from environment
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        self.system_prompt = """You are an AI assistant specialized in Red Hat OpenShift Service on AWS (ROSA) and Cluster API (CAPI) operations.

CRITICAL INSTRUCTION - READ CAREFULLY:
When the user asks "What clusters are running?" or similar questions about clusters, you MUST:
1. Look at the "Current cluster context" section that will be provided
2. Find the line that says "Active clusters: [number]"
3. Find the lines starting with "  - " which contain cluster details
4. COPY the cluster name, namespace, and status from those lines into your response
5. NEVER just say "You have 1 cluster(s)" without the name

MANDATORY RESPONSE FORMAT for cluster queries:
"You have [N] cluster(s):
- [exact cluster name from context] (namespace: [exact namespace from context], status: [exact status from context])"

Example - If context shows:
"  - wed-rosa-test (namespace: ns-rosa-hcp): uninstalling"

You MUST respond:
"You have 1 cluster:
- wed-rosa-test (namespace: ns-rosa-hcp, status: uninstalling)"

Your role is to help users:
- List running clusters with their full details (name, status, namespace)
- Analyze actual provisioning job logs to identify specific errors
- Troubleshoot failed cluster provisioning by examining real error messages
- Interpret Ansible playbook output and Kubernetes resource status
- Provide targeted fixes based on the actual error (not generic advice)
- Explain CAPI and ROSA concepts

When listing clusters:
- READ the "Current cluster context" section that will be provided to you
- EXTRACT the cluster name, namespace, and status from the context
- ALWAYS include these details in your response
- Example response: "You have 1 cluster:
  - wed-rosa-test (namespace: ns-wed-rosa-test, status: ready)"

When analyzing failed clusters:
1. **Read the actual job logs** provided in the context
2. **Identify the specific error** (credentials, network timeout, AWS API error, IAM permissions, etc.)
3. **Provide the exact fix** for that specific error
4. **Reference the line/section** of the log that shows the problem

Common error patterns to look for:
- "AWS credentials" or "AccessDenied" → AWS credential issue
- "NetworkNotReady" or "VPC creation failed" → Network configuration problem
- "RoleNotReady" or "IAM role" → IAM role configuration issue
- "secret not found" → rosa-creds-secret missing
- "Unauthorized" or "login failed" → OpenShift Hub login issue
- "timeout" → Resource creation taking too long

Be specific, cite the actual error from logs, and give the exact fix. Avoid generic troubleshooting steps unless no logs are available."""

    async def chat(
        self,
        message: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message with cluster context

        Args:
            message: User's message
            context: Current cluster state and environment info
            history: Previous conversation messages

        Returns:
            Response with assistant message and optional suggestions
        """
        # Build context summary
        context_summary = self._build_context_summary(context)

        print(f"📝 [CONTEXT SUMMARY SENT TO CLAUDE]:\n{context_summary}\n")

        # Build conversation history
        messages = []
        if history:
            for msg in history[-5:]:  # Last 5 messages
                messages.append({
                    "role": msg.get("role"),
                    "content": msg.get("content")
                })

        user_prompt = f"{context_summary}\n\nUser question: {message}"
        print(f"💬 [FULL PROMPT TO CLAUDE]:\n{user_prompt}\n")

        messages.append({
            "role": "user",
            "content": user_prompt
        })

        try:
            # Call Claude API
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages
            )

            assistant_message = response.content[0].text

            # Extract suggestions (if any)
            suggestions = self._extract_suggestions(assistant_message, context)

            return {
                "response": assistant_message,
                "suggestions": suggestions
            }

        except Exception as e:
            return {
                "response": f"I encountered an error: {str(e)}. Please try again or contact support.",
                "suggestions": []
            }

    def _build_context_summary(self, context: Dict[str, Any]) -> str:
        """Build a summary of the current cluster context"""
        summary_parts = ["Current cluster context:"]

        clusters = context.get("clusters", [])
        print(f"🔍 DEBUG: Clusters from context: {clusters}")  # DEBUG
        if clusters:
            summary_parts.append(f"\nActive clusters: {len(clusters)}")
            for cluster in clusters[:5]:  # First 5 clusters
                status = cluster.get("status", "unknown")
                name = cluster.get("name", "unnamed")
                namespace = cluster.get("namespace", "unknown")
                print(f"🔍 DEBUG: Processing cluster - name: {name}, namespace: {namespace}, status: {status}")  # DEBUG
                summary_parts.append(f"  - {name} (namespace: {namespace}): {status}")
        else:
            summary_parts.append("\nNo active clusters")
            print("🔍 DEBUG: No clusters found in context")  # DEBUG

        # Add job logs if available (for failed clusters)
        job_logs = context.get("job_logs", [])
        if job_logs:
            summary_parts.append("\n\nRecent provisioning job logs:")
            for log_entry in job_logs[:3]:  # Last 3 jobs
                job_id = log_entry.get("job_id", "unknown")
                status = log_entry.get("status", "unknown")
                cluster_name = log_entry.get("cluster_name", "unknown")
                logs = log_entry.get("logs", "")

                summary_parts.append(f"\nJob {job_id} for cluster '{cluster_name}' - Status: {status}")
                if logs:
                    # Include last 20 lines of logs for context
                    log_lines = logs.split('\n')[-20:]
                    summary_parts.append("Log excerpt:")
                    summary_parts.append('\n'.join(log_lines))

        # Add resource status if available
        resource_status = context.get("resource_status", {})
        if resource_status:
            summary_parts.append("\n\nCluster Resource Status:")
            for resource_type, resources in resource_status.items():
                summary_parts.append(f"\n{resource_type}:")
                summary_parts.append(resources)

        return "\n".join(summary_parts)

    def _extract_suggestions(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> List[str]:
        """Extract actionable suggestions from the response"""
        suggestions = []

        clusters = context.get("clusters", [])

        # If we just listed clusters, offer to provide more details
        if clusters and ("cluster" in message.lower() or "running" in message.lower()):
            suggestions.append("What is the cluster name?")
            if len(clusters) > 0:
                cluster_name = clusters[0].get("name", "cluster")
                suggestions.append(f"Tell me more about {cluster_name}")
            suggestions.append("Provision new cluster")

        # Common patterns that should become clickable actions
        if "provision" in message.lower():
            suggestions.append("How do I provision a new cluster?")

        if "delete" in message.lower() or "remove" in message.lower():
            suggestions.append("How do I safely delete a cluster?")

        if "status" in message.lower() or "health" in message.lower():
            suggestions.append("Check cluster health status")

        if "error" in message.lower() or "fail" in message.lower():
            suggestions.append("Show me cluster error logs")
            suggestions.append("Troubleshoot failed cluster")

        # If showing cluster details, ask if they want to do something with it
        if any(c.get("name", "") in message for c in clusters):
            suggestions.append("What can I do with this cluster?")

        return suggestions[:3]  # Max 3 suggestions


# FastAPI endpoint integration example
"""
Add to app.py:

from ai_assistant_service import AIAssistantService

ai_service = AIAssistantService()

@app.post("/api/ai-assistant/chat")
async def ai_assistant_chat(request: dict):
    '''AI assistant chat endpoint'''
    try:
        message = request.get("message")
        context = request.get("context", {})
        history = request.get("history", [])

        response = await ai_service.chat(message, context, history)
        return response
    except Exception as e:
        return {"error": str(e)}, 500
"""
