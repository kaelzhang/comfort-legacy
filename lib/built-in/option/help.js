'use strict';

exports.options = {
  command: {
    enumerable: false,
    type: String,
    info: 'specify which command to show help.',

    // ctx help --command build
    // ctx help build
    setter: function(command) {
      if (!command) {

        // ctx help build
        // 1   2    3
        command = this.get('_')[0];
      }

      return command;
    }
  }
};

exports.info = 'Show help manual';

exports.usage = [
  '{{name}} help <command>'
];