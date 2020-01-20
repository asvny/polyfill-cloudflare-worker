const path = require('path')
const mode = process.env.NODE_ENV || 'development'

module.exports = {
  entry: {
    main: './src/index.ts'
  },
  output: {
    filename: `worker.js`,
    path: path.join(__dirname, 'dist'),
  },
  devtool: 'source-map',
  mode,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
  target: 'webworker',
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