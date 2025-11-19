#!/bin/bash

echo "Converting TypeScript files to JavaScript..."

# Rename all .tsx files to .jsx
find src -name "*.tsx" -type f | while read file; do
  mv "$file" "${file%.tsx}.jsx"
  echo "Renamed: $file -> ${file%.tsx}.jsx"
done

# Rename all .ts files to .js (except type definition files)
find src -name "*.ts" ! -name "*.d.ts" -type f | while read file; do
  mv "$file" "${file%.ts}.js"
  echo "Renamed: $file -> ${file%.ts}.js"
done

# Update imports in all .jsx and .js files
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i '' 's/\.tsx"/\.jsx"/g' {} +
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i '' "s/\.tsx'/\.jsx'/g" {} +
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i '' 's/from "\.\/\(.*\)\.tsx"/from ".\/\1.jsx"/g' {} +
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i '' "s/from '\.\/\(.*\)\.tsx'/from '.\/\1.jsx'/g" {} +

echo ""
echo "✅ Conversion complete!"
echo ""
echo "Next steps:"
echo "1. Update vite.config.ts to vite.config.js manually"
echo "2. Remove or update tsconfig files"
echo "3. Run: npm run dev"
echo "4. Test the application"
echo "5. Commit: git add . && git commit -m 'Convert to JavaScript' && git push"
