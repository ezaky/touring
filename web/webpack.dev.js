const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    port: 8080,
    historyApiFallback: true, // so any path after the url (e.g /app or /join) is passed to app to handle
    open: {
        target: ["/app"]
    },
    hot: true,
    client: {
      overlay: false // added to avoid annoying overlay for abort/cancel error
    },
    proxy: [
      {
        context: ["/touring", "/whiz"],
        target: 'http://localhost:9000', // see index.ts in server
        secure: false
      }
    ]
  }
});
