const path = require('path');
const url = require('url');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

//
// Environment
//
// To clarify:
// - NODE_ENV controls the build type. It's unset for development builds, it's set to 'production'
//   for release builds.
// - ENVIRONMENT controls the deployment environment (development, staging, production).
//

process.env.ENVIRONMENT = process.env.ENVIRONMENT || 'development';
process.env.API_BASE_URL = process.env.API_BASE_URL || '/api/v1';
process.env.BASE_URL = process.env.BASE_URL || '';

var assetsHref = '/';

switch (process.env.ENVIRONMENT) {
    case 'development':
        process.env.NODE_ENV = 'development';
        break;
    case 'production':
    case 'staging':
        if (!process.env.LOCAL_ASSETS) {
            assetsHref = process.env.ASSETS_BASE_URL + process.env.VERSION + '/';
        }

        process.env.NODE_ENV = 'production';
        break;
}

//
// Debug output
//

console.log('Assets:', assetsHref || 'local');
console.log('Base API URL:', process.env.API_BASE_URL);

console.log('Environment variables:');
['ENVIRONMENT', 'NODE_ENV'].map(function (value) {
    console.log('    ' + value + '=' + process.env[value]);
});

//
// Chunk names
//

function getChunkNamePattern(extension) {
    return '[name].' + extension;
}

//
// Source maps
//

var devtoolConfig = 'cheap-module-source-map';
if (process.env.NODE_ENV === 'production') {
    devtoolConfig = undefined;
}

//
// Webpack
//

module.exports = {
    devtool: devtoolConfig,
    entry: ['babel-polyfill', './src/index.jsx'],

    devServer: {
        historyApiFallback: true,
        index: 'index.html',
        proxy: {
            '/api': {
                target: 'http://api:5454/',
                secure: false
            }
        }
    },

    module: {
        rules: [
            {
                enforce: 'pre',
                loader: 'source-map-loader',
                test: /\.js$/,
            },
            {
                test: /\.(js|jsx)$/,
                loader: require.resolve('babel-loader'),
                options: {

                  // This is a feature of `babel-loader` for webpack (not Babel itself).
                  // It enables caching results in ./node_modules/.cache/babel-loader/
                  // directory for faster rebuilds.
                  cacheDirectory: true,
                },
              },
            {
                test: /\.css$/, use: ExtractTextPlugin.extract({
                    use: 'css-loader',
                }),
            },
            {
                test: /\.scss$/, use: ExtractTextPlugin.extract({
                    use: [{
                        loader: 'css-loader',
                        options: {
                            alias: {
                                '../fonts/bootstrap': path.resolve('node_modules/bootstrap-sass/assets/fonts/bootstrap'),
                            },
                            import: false,
                        },
                    }, {
                        loader: 'sass-loader',
                        options: {
                            includePaths: [path.resolve('node_modules')],
                        },
                    }]
                }),
            },
            {
                test: /\.(eot|jpeg|jpg|png|svg|ttf|woff|woff2)/,
                use: 'file-loader',
            }
        ],
    },

    output: {
        filename: getChunkNamePattern('js'),
        path: path.resolve('dist'),
    },

    plugins: [
        new ExtractTextPlugin(getChunkNamePattern('css')),
        new HtmlWebpackPlugin({
            favicon: 'public/favicon.ico',
            assetsHref: assetsHref,
            inject: false,
            template: './public/index.html',
            title: 'Batchiepatchie',
        }),
        new webpack.EnvironmentPlugin(['ENVIRONMENT', 'NODE_ENV', 'API_BASE_URL', 'BASE_URL'])
    ],

    resolve: {
        extensions: [
            '.js',
            '.jsx',
        ],
        modules: [
            'node_modules',
            'src'
        ]
    },
};
