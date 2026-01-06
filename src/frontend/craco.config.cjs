/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const assetsPath = path.resolve(__dirname, 'public/assets');

const aliasModuleNameMapper = {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@assets/(.*)$': '<rootDir>/public/assets/$1',
};

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve = webpackConfig.resolve || {};
            webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];

            webpackConfig.resolve.plugins.push(
                new TsconfigPathsPlugin({
                    configFile: path.resolve(__dirname, 'jsconfig.json'),
                }),
            );

            webpackConfig.resolve.alias = {
                ...(webpackConfig.resolve.alias || {}),
                '@assets': assetsPath,
                '@pages': path.resolve(__dirname, 'src/pages'),
            };

            const moduleScopePlugin = webpackConfig.resolve.plugins.find(
                (plugin) => plugin?.constructor?.name === 'ModuleScopePlugin',
            );
            if (moduleScopePlugin && Array.isArray(moduleScopePlugin.allowedPaths)) {
                moduleScopePlugin.allowedPaths.push(assetsPath);
            }

            return webpackConfig;
        },
    },
    jest: {
        configure: (jestConfig) => {
            jestConfig.moduleNameMapper = {
                ...(jestConfig.moduleNameMapper || {}),
                ...aliasModuleNameMapper,
            };
            return jestConfig;
        },
    },
};
