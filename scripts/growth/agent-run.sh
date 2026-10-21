#!/bin/sh
# Subscription CLI only. The engine supplies the task on stdin.
set -eu
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDECODE
exec claude -p --permission-mode auto --strict-mcp-config --mcp-config '{"mcpServers":{}}'
