#!/bin/bash
# Fix snap cgroup delegation issue
# This fixes: "/user.slice/user-1000.slice/session-1.scope is not a snap cgroup"

set -e

echo "Creating cgroup delegation configuration for user@ service..."
sudo mkdir -p /etc/systemd/system/user@.service.d/
sudo tee /etc/systemd/system/user@.service.d/delegate.conf > /dev/null << 'EOF'
[Service]
Delegate=cpu cpuset io memory pids
EOF

echo "Creating cgroup delegation configuration for user slice..."
sudo mkdir -p /etc/systemd/system/user-.slice.d/
sudo tee /etc/systemd/system/user-.slice.d/delegate.conf > /dev/null << 'EOF'
[Slice]
Delegate=cpu cpuset io memory pids
EOF

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo ""
echo "Done! Please reboot the system:"
echo "  sudo reboot"
echo ""
echo "After reboot, test with: snap run firefox"
