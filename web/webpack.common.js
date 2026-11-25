const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {test: /\.ts$/, use: 'ts-loader'},
      { test: /\.css$/, use: ["style-loader", "css-loader"] }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    /*
    // This tells the resolver: "If you see .js, it might actually be a .ts file". 
    // Added for the WhizModuleMap import
    extensionAlias: {
      '.js': ['.ts', '.js']
    }
      */
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../dist/web'),
    clean: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      favicon: './src/assets/logo.svg'
    })
  ]
};