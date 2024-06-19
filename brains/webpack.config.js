const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
// const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'dist/bundle.css',
    }),
    new UglifyJSPlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'

    }),
    // new BrowserSyncPlugin({
    //   files: "**/*.php",
    //   proxy: "http://hence.local", // your dev server here
    // }),
  ],
  output: {
    path: path.resolve(__dirname),
    filename: 'dist/bundle.min.js',
  },
  optimization: {
    minimize: true,
    minimizer: [
      // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
      // `...`,
      new CssMinimizerPlugin(),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(woff|woff2|svg)$/,
        use: {
          loader: 'url-loader',
          options: {
            esModule: false,
          }
        },
      },
      {
        test:/\.(s*)css$/,
        use:[
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoprefixer()]
            }
          },
          {
            loader: 'sass-loader'
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(gif|png|jpe?g)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: "wp-content/themes/[name]/assets",
              name: "[hash].[ext]",
            }
          },
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65
              },
              // optipng.enabled: false will disable optipng
              optipng: {
                enabled: false,
              },
              pngquant: {
                quality: '65-90',
                speed: 4
              },
              gifsicle: {
                interlaced: false,
              },
              // the webp option will enable WEBP
              webp: {
                quality: 75
              }
            }
          },
        ]
      }
    ]
  }
};

