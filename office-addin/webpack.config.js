const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Certificado confiável do Office Add-in Dev Certs
const certPath = path.join(process.env.HOME || process.env.USERPROFILE, '.office-addin-dev-certs');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      taskpane: './src/taskpane/taskpane.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/index.html',
        filename: 'taskpane.html',
        chunks: ['taskpane']
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.xml',
            to: 'manifest.xml'
          },
          {
            from: 'assets',
            to: 'assets',
            noErrorOnMissing: true
          },
          // Páginas estáticas (privacidade, termos, suporte)
          {
            from: 'src/pages',
            to: '',
            noErrorOnMissing: true
          }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      port: 3001,
      server: {
        type: 'https',
        options: {
          key: fs.readFileSync(path.join(certPath, 'localhost.key')),
          cert: fs.readFileSync(path.join(certPath, 'localhost.crt'))
        }
      },
      hot: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    devtool: isProduction ? 'source-map' : 'inline-source-map'
  };
};
