#!/bin/bash

# Build the project
npm run build

# Create the _routes.json file
cat > dist/client/_routes.json << 'EOF'
{
  "version": 1,
  "include": [
    "/api/*"
  ],
  "exclude": [
    "/*"
  ]
}
EOF

echo "✅ Build complete with _routes.json"