const path = require('path')
const webpack = require('webpack')

const mode = process.env.NODE_ENV || 'development'

module.exports = {
  output: {
    filename: `worker.js`,
    path: path.join(__dirname, 'dist'),
    // libraryTarget: 'umd',
  },
  devtool: 'source-map',
  mode,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  // DISABLE Webpack's built-in process and Buffer polyfills!
  node: {
    process: true,
    Buffer: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        },
      },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
    ],
  },
}