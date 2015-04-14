var webpack = require('webpack');

module.exports = {
    devtool: 'eval',
    entry: [
        './src/superagent.js'
    ],
    output: {
        path: __dirname + '/dist/',
        filename: 'superagent-oauth2-client.js',
        library: 'superagent-oauth2-client',
        libraryTarget: 'umd'
    },
    plugins: [
        new webpack.BannerPlugin(require('./banner')),
        new webpack.DefinePlugin({
            ENV_PRODUCTION: true
        })
    ],
    resolve: {
        extensions: ['', '.js']
    },
    module: {
        loaders: [
            { test: /\.js$/, exclude: /node_modules/, loader: 'babel' },
        ]
    }
};