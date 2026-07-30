#!/bin/sh
# build and publish dist/ to the gh-pages branch (GitHub Pages serves it)
set -e
npm run build
touch dist/.nojekyll
cd dist
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date +%F-%H%M)"
git push -f https://github.com/liukrimhrim/jigsaw.git gh-pages
cd ..
rm -rf dist/.git
echo "deployed: https://liukrimhrim.github.io/jigsaw/"
