const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = merge(common, {
  mode: 'production',
    // Prevents generating .map files that expose source code
  devtool: false,
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),

    new CopyPlugin({
        patterns: [
          { 
            from: path.resolve(__dirname, '../web/public'),
            to: path.resolve(__dirname, "../dist/public") 
          }
        ]
      })
    /*
    new BundleAnalyzerPlugin({
      analyzerMode: 'static', // Generates an HTML file instead of starting a server
      openAnalyzer: true,     // Automatically opens the report in your browser
    }),
    */
  ],
  optimization: {
    minimize: true
  }
});