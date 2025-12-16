# Minikube Pod Network Fix for Podman on macOS

## Problem Summary

When running Minikube with the Podman driver on macOS, pods cannot reach external networks (DNS, HTTP, AWS APIs, etc.) even though the Minikube VM itself has full external connectivity. This blocks ROSA cluster provisioning and other network-dependent operations.

## Root Cause

The issue is caused by the default `DROP` policy on the iptables `FORWARD` chain in Minikube, combined with Podman's user-mode networking on macOS. Pod traffic from the 10.244.0.0/16 network needs explicit forwarding rules to reach external networks through the Minikube VM's eth0 interface.

### Symptoms
- Pods cannot resolve DNS (timeouts to 8.8.8.8, 1.1.1.1, etc.)
- CoreDNS logs show: `read udp 10.244.0.x:port->8.8.8.8:53: i/o timeout`
- CAPA/ROSA controllers cannot reach AWS APIs or Red Hat SSO
- Minikube VM itself CAN reach external networks (ping, curl work from VM)

### Technical Details

**Network Flow:**
```
Pod (10.244.0.x) → veth → Minikube VM (192.168.58.2) → Podman network (192.168.58.1) → Podman machine → host → external
```

**Missing Rules:**
1. `FORWARD` chain needs to accept traffic from pod network (10.244.0.0/16)
2. `NAT POSTROUTING` chain needs to masquerade pod traffic to external networks

## Solution

### Automatic Fix (Permanent)

A systemd service has been installed that automatically applies the network fix on every Minikube start.

**Service Location:** `/etc/systemd/system/minikube-network-fix.service`
**Script Location:** `/usr/local/bin/minikube-network-fix.sh`
**Status:** Enabled (runs automatically on boot)

### Manual Fix (Temporary)

If you need to apply the fix manually without restarting:

```bash
# SSH into Minikube
minikube -p test3 ssh

# Run the fix script
sudo /usr/local/bin/minikube-network-fix.sh

# Or apply rules manually
sudo iptables -I FORWARD 1 -s 10.244.0.0/16 -j ACCEPT
sudo iptables -t nat -A POSTROUTING -s 10.244.0.0/16 ! -o docker0 -j MASQUERADE
```

### Verification

Test pod connectivity:

```bash
# Test DNS resolution
kubectl --context test3 run test-dns --image=busybox --restart=Never --rm -i -- \
  sh -c "nslookup google.com"

# Test HTTP connectivity
kubectl --context test3 run test-http --image=curlimages/curl --restart=Never --rm -i -- \
  sh -c "curl -I https://api.openshift.com"

# Test specific Red Hat services
kubectl --context test3 run test-sso --image=curlimages/curl --restart=Never --rm -i -- \
  sh -c "nslookup sso.redhat.com && curl -I https://sso.redhat.com"
```

Expected results: All commands should complete successfully without timeouts.

### Check Service Status

```bash
# Check if the service is enabled
minikube -p test3 ssh -- "sudo systemctl is-enabled minikube-network-fix.service"

# View service logs
minikube -p test3 ssh -- "sudo journalctl -u minikube-network-fix.service"

# Manually trigger the service
minikube -p test3 ssh -- "sudo systemctl start minikube-network-fix.service"
```

## Implementation Details

### Fix Script (`/usr/local/bin/minikube-network-fix.sh`)

```bash
#!/bin/bash
# Minikube Pod Network Fix for Podman on macOS
# This script fixes pod-to-external network connectivity

echo "Applying Minikube network fixes..."

# Add FORWARD rule for pod network
iptables -C FORWARD -s 10.244.0.0/16 -j ACCEPT 2>/dev/null || \
  iptables -I FORWARD 1 -s 10.244.0.0/16 -j ACCEPT

# Add MASQUERADE rule for pod network (if not exists)
iptables -t nat -C POSTROUTING -s 10.244.0.0/16 ! -o docker0 -j MASQUERADE 2>/dev/null || \
  iptables -t nat -A POSTROUTING -s 10.244.0.0/16 ! -o docker0 -j MASQUERADE

echo "Network fixes applied successfully"
iptables -L FORWARD -n | head -5
```

### Systemd Service (`/etc/systemd/system/minikube-network-fix.service`)

```ini
[Unit]
Description=Minikube Pod Network Fix
After=network.target docker.service
Before=kubelet.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/minikube-network-fix.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### If pods still cannot reach external networks:

1. **Check if rules are applied:**
   ```bash
   minikube -p test3 ssh -- "sudo iptables -L FORWARD -n -v | grep 10.244"
   minikube -p test3 ssh -- "sudo iptables -t nat -L POSTROUTING -n -v | grep 10.244"
   ```

2. **Verify IP forwarding is enabled:**
   ```bash
   minikube -p test3 ssh -- "sudo sysctl net.ipv4.ip_forward"
   ```
   Should return: `net.ipv4.ip_forward = 1`

3. **Check CoreDNS logs for errors:**
   ```bash
   kubectl --context test3 logs -n kube-system -l k8s-app=kube-dns --tail=50
   ```

4. **Test Minikube VM connectivity:**
   ```bash
   minikube -p test3 ssh -- "ping -c 2 8.8.8.8"
   minikube -p test3 ssh -- "nslookup google.com"
   ```
   If VM connectivity fails, the issue is at the Podman level, not iptables.

5. **Reapply the fix:**
   ```bash
   minikube -p test3 ssh -- "sudo /usr/local/bin/minikube-network-fix.sh"
   ```

### If Minikube is recreated:

The fix needs to be reapplied to the new Minikube instance:

```bash
# Copy the script to the new Minikube instance
minikube -p <profile-name> cp /tmp/minikube-network-fix.sh /home/docker/minikube-network-fix.sh

# Install the script and service
minikube -p <profile-name> ssh -- "
  sudo mv /home/docker/minikube-network-fix.sh /usr/local/bin/ && \
  sudo chmod +x /usr/local/bin/minikube-network-fix.sh && \
  sudo tee /etc/systemd/system/minikube-network-fix.service > /dev/null << 'EOF'
[Unit]
Description=Minikube Pod Network Fix
After=network.target docker.service
Before=kubelet.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/minikube-network-fix.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload && \
  sudo systemctl enable minikube-network-fix.service && \
  sudo systemctl start minikube-network-fix.service
"
```

## Known Limitations

1. **Podman User-Mode Networking**: This is a workaround for Podman's user-mode networking limitations on macOS. The underlying issue is that Podman's SLIRP network stack doesn't fully support nested networking scenarios.

2. **Persistence**: The fix persists across Minikube restarts but NOT across Minikube deletions/recreations. If you delete and recreate the Minikube cluster, you'll need to reinstall the fix.

3. **Other Profiles**: If you create additional Minikube profiles, each one needs the fix applied separately.

## Alternative Solutions

If this fix doesn't work or you encounter other issues:

1. **Try Docker driver instead of Podman:**
   ```bash
   minikube start --driver=docker
   ```

2. **Try QEMU driver:**
   ```bash
   minikube start --driver=qemu
   ```

3. **Use Kind instead of Minikube:**
   Kind (Kubernetes in Docker) may have better networking support on macOS with Podman.

4. **Use a remote cluster:**
   For production use, consider using a real OpenShift/Kubernetes cluster instead of local development clusters.

## Related Issues

- Podman User-Mode Networking: https://github.com/containers/podman/issues
- Minikube Podman Driver: https://minikube.sigs.k8s.io/docs/drivers/podman/
- CNI Networking: https://github.com/containernetworking/cni

## Success Indicators

After applying the fix, you should see:
- ✅ DNS lookups work from pods
- ✅ HTTP/HTTPS requests succeed from pods
- ✅ CAPA controller can reach AWS CloudFormation APIs
- ✅ ROSA controller can reach Red Hat SSO (sso.redhat.com)
- ✅ Application-level errors instead of network timeouts

---

**Last Updated:** 2025-12-16
**Applies To:** Minikube with Podman driver on macOS (test3 profile)
**Fix Status:** ✅ Installed and Enabled
