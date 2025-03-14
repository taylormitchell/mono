#!/bin/bash
# This script is meant to be run periodically on the EC2 instance
# to log the status of the instance.

# Get the memory usage
memory_usage=$(free -m | awk '/^Mem:/ {print $3 "/" $2 " MB"}')

# Get the top command output (first 5 lines)
top_output=$(top -bn1 | head -5)

# Create the log files if they don't exist
mkdir -p /var/log
touch /var/log/memory_usage.log /var/log/system_status.log

# Log the memory usage
echo "$(date) - Memory Usage: $memory_usage" >> /var/log/memory_usage.log

# Log the top command output
echo "$(date) - System Status:" >> /var/log/system_status.log
echo "$top_output" >> /var/log/system_status.log
echo "-----------------------------------" >> /var/log/system_status.log