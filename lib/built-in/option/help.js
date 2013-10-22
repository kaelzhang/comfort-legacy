'use strict';

exports.options = {
    command: {
        type: String,
        info: 'specify which command to show help.',

        // ctx help --command build
        // ctx help build
        setter: function(command) {
            if(!command){

                // ctx help build
                // 1   2    3
                command = this.get('_')[0];
            }

            return command || 

                // show all command
                '*';
        }
    },

    detail: {
        type: Boolean,
        default: true,
        info: 'whether show detail help information.',

        // ctx help build
        // -> ctx help --command build --detail
        setter: function(list) {
            return this.get('command') === '*' ? 
                // if show all command, show quick help
                false : 
                list === false ? 

                    // ctx help build --no-detail
                    // -> detail: false
                    false : 

                    // ctx help build            -> detail: undefined
                    // ctx help build --detail  -> detail: true
                    // -> detail: true
                    true;
        }
    }
};

exports.info = 'Show help manual';

exports.usage = [
    '{{name}} help [--command <command>]',
    '{{name}} help <command>'
];
