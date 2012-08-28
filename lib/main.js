var fs = require('fs');
var semver = require('semver');
var npm = require('npm');
var step = require('step');
var path = require('path');
var conf, path;
var opt = require('optimist')
    .usage('Usage: $0 [--help] [path/to/package.json]')
    .check(function(argv) {
        if(!argv.help) {
            path = argv._.length > 0 ? argv._[0] : './package.json';
            try {
                path = fs.realpathSync(path);
            } catch(e) {
                throw new Error('File ' + path + ' does not exist');
            }
            conf = JSON.parse(fs.readFileSync(path));
        }
    })
    ['default']('l', 'warn')
    .string('l')
    .alias('l', 'loglevel')
    .describe('l', 'Loglevel for npm commands')
    .boolean('h')
    .alias('h', 'help')
    .describe('h', 'Show this message');
var argv = opt.argv;
if(argv.help) {
    opt.showHelp();
} else {
    npm.load(conf, function(err) {
        if(err) {
            throw err;
        }
        npm.config.set('loglevel', argv.loglevel);
        step(function() {
            var group = this.group();
            var getVersionInfo = function(packageName, cb, deps) {
                npm.commands.show([packageName, 'versions'], true, function(err, data) {
                    if(err) {
                        cb(err, null);
                        return;
                    }
                    var versions = data[Object.keys(data)[0]].versions;
                    cb(null, {
                        "package": packageName,
                        "specifiedVersion": deps[packageName],
                        "latestVersion": versions[versions.length - 1]
                    });
                });
            };
            var checkDependencies = function(deps) {
              for(var packageName in deps) {
                  if(deps.hasOwnProperty(packageName)) {
                      getVersionInfo(packageName, group(), deps);
                  }
              }
            };
            checkDependencies(conf.dependencies);
            checkDependencies(conf.devDependencies);
        }, function(err, versions) {
            if(err) {
                throw err;
            }
            versions.forEach(function(p) {
                if(!semver.satisfies(p.latestVersion, p.specifiedVersion)) {
                    console.log(p['package'] + ' has ' + p.latestVersion + ', but ' + p.specifiedVersion + ' is specified');
                }
            });
        });
    });
}
