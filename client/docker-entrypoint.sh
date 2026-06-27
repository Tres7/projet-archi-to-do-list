#!/bin/sh
echo "window.__ENV__ = { VITE_API_VERSION: \"${VITE_API_VERSION:-v1}\" };" \
    > /usr/share/nginx/html/env-config.js
