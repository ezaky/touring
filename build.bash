
set -e
root=$(pwd)

cd $root
rm -rf dist
mkdir dist
mkdir dist/shared
mkdir dist/web
mkdir dist/server

echo Building touring root
echo ---------------------
cd $root
rm -rf node_modules
rm -f package-lock.json
npm install
cd $root/dist/
cp $root/package.json .
npm install --omit=dev

echo Building touring shared
echo -----------------------
cd $root/shared
rm -rf node_modules
rm -f package-lock.json
npm install
npm run build
cd $root/dist/shared
cp $root/shared/package.json .
npm install --omit=dev

echo Building touring server
echo -----------------------
cd $root/server
rm -rf node_modules
rm -f package-lock.json
npm install
npm run build
cd $root/dist/server
cp $root/server/package.json .
npm install --omit=dev

echo Building touring web
echo --------------------
set_webawesome_context() {
    npm config set "@web.awesome.me:registry" --location project https://npm.cloudsmith.io/fortawesome/webawesome-pro/
    npm config set "//npm.cloudsmith.io/fortawesome/webawesome-pro/:_authToken=YBmC6Qs1gPr88eKdsfiMc" --location project
    export WEBAWESOME_NPM_TOKEN="[YBmC6Qs1gPr88eKdsfiMc]"
}
cd $root/web
rm -rf node_modules
rm -f package-lock.json
set_webawesome_context
npm install
rm -f .npmrc
npm run build
cd $root/dist/web
cp $root/web/package.json .
set_webawesome_context
npm install --omit=dev
rm -f .npmrc