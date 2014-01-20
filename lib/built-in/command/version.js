'use strict';

var version = exports;

var fs = require('fs');
var node_path = require('path');

version.run = function (options, callback) {
    var cwd = options.cwd;
    var package_json = node_path.join(cwd, 'package.json');
    var logger = this.logger;

    fs.readFile(package_json, function (err, content) {
        if ( err ) {
            return callback({
                code: 'EREADPKG',
                message: 'fails to read "' + package_json + '", err: ' + err.stack,
                data: {
                    file: package_json,
                    error: err
                }
            });
        }

        var pkg;

        try {
            pkg = JSON.parse(content.toString());

        } catch(e) {
            return callback({
                code: 'EPARSEJSON',
                message: 'fails to parse package.json, path "' + package_json + '"',
                data: {
                    file: package_json,
                    error: e
                }
            });
        }

        var version = pkg.version;

        if ( !version ) {
            return callback({
                code: 'ENOVERSION',
                message: 'No version found in package.json, "' + package_json + '"',
                data: {
                    file: package_json
                }
            });
        }

        logger.info(version);

        callback(null);
    });
};