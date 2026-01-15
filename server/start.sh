#!/usr/bin/env bash
set -o errexit

flask db upgrade

gunicorn "app:create_app()" --bind 0.0.0.0:$PORT
