const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const _ = require('lodash');

const pwd = shell.pwd();

const silent = process.env.npm_config_debug !== 'true';
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');

shell.echo('🏗  Building the admin...');

const build = shell.exec(`cd "${path.resolve(appPath, 'admin')}" && APP_PATH="${appPath}" npm run build`, {
  silent
});

if (build.stderr && build.code !== 0) {
  console.error(build.stderr);
  process.exit(1);
}

shell.echo('✅  Success');
shell.echo('');

if (process.env.npm_config_plugins === 'true') {
  const plugins = path.resolve(appPath, 'plugins');

  // TODO: build plugins in async
  shell.ls('* -d', plugins)
    .filter(x => {
      let hasAdminFolder;

      try {
        fs.accessSync(path.resolve(appPath, 'plugins', x, 'admin', 'src', 'containers', 'App'));
        hasAdminFolder = true;
      } catch(err) {
        hasAdminFolder = false;
      }

      return hasAdminFolder;
    })
    .forEach(function (plugin) {
      shell.echo(`🔸  Plugin - ${_.upperFirst(plugin)}`);
      shell.echo('📦  Installing packages...');
      shell.exec(`cd "${path.resolve(plugins, plugin)}" && npm install`, {
        silent
      });

      if (isDevelopmentMode) {
        shell.exec(`cd "${path.resolve(plugins, plugin)}" && npm link strapi-helper-plugin`, {
          silent
        });
      } else {
        shell.exec(`cd "${path.resolve(plugins, plugin, 'node_modules', 'strapi-helper-plugin')}" && npm install`, {
          silent
        });
      }

      shell.echo('🏗  Building...');

      const { execFile } = require('child_process');

      execFile('npm', ['run', 'build'], { cwd: path.resolve(plugins, plugin), env: { ...process.env, APP_PATH: appPath }, stdio: 'inherit' }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          process.exit(1);
        }
      });

      if (build.stderr && build.code !== 0) {
        console.error(build.stderr);
        process.exit(1);
      }

      shell.echo('✅  Success');
      shell.echo('');
    });
}
