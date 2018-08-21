const path = require('path');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: './src/turtle.js',
  module: {
    rules: [{
      loader: 'babel-loader',
      test: /\.js$/,
      exclude: /node_modules/
    }]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'turtleDB.min.js',
    library: 'TurtleDB',
    libraryTarget: 'umd'
  }
};