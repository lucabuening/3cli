import inquirer from 'inquirer';
import spawn from 'child_process';

const types = ['fix', 'feat', 'chore', 'docs', 'style', 'refactor', 'perf', 'test'];
let scopes = [];

function searchType(answers, input) {
    input = input || '';
    return new Promise(function (resolve) {
        resolve(types.filter(t => t.toLowerCase().includes(input.toLowerCase())))
    });
}

function getScopes() {
    const ls = spawn.exec("git --no-pager log --oneline");

    ls.stdout.on('data', (data) => {
        scopes.push(...data.match(/\(.*?\)/ig).map(e => e.slice(1, -1)));
        scopes = [... new Set(scopes)]
    });
}

function searchScopes(answers, input) {
    input = input || '';
    return new Promise(function (resolve) {
        resolve(scopes.filter(s => s.toLowerCase().includes(input.toLowerCase())));
    })
}

async function promt() {
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

    return await inquirer
        .prompt([
            {
                type: 'autocomplete',
                name: 'type',
                message: 'Which type do you want to chose?',
                source: searchType,
            },
            {
                type: 'confirm',
                name: 'breaking',
                message: 'Is this a breaking change?',
                default: false
            },
            {
                type: 'autocomplete',
                name: 'scope',
                message: 'Which scope to you want to chose?',
                suggestOnly: true,
                source: searchScopes
            },
            {
                type: 'input',
                name: 'description',
                message: "Type in the commit description:",
                validate: function(val) {
                    return !!val;
                },
            },
            {
                type: 'input',
                name: 'body',
                message: "Type in the optional body, or leave it empty:"
            },
            {
                type: 'input',
                name: 'footer',
                message: "Type in the optional footer, or leave it empty:"
            }
        ]);
}

function buildCommitCommand(options) {
    const header =
        `${options.type}${options.breaking ? '!' : ''}${options.scope ? '(' + options.scope + ')' : ''}: ${options.description}`;
    const body = (options.body ? '\n\n'+options.body : '' ) + (options.footer ? '\n\n'+options.footer : '' );
    return header + body;
}

function execCommit(message) {
    const res = spawn.exec(`git commit -m "${message}"`);
    res.stdout.on('data', (data) => {
        console.log(data);
    });

    res.stderr.on('data', (data) => {
        console.error(data);
    });
}

export async function cli(args) {
    getScopes();
    const options = await promt();
    execCommit(buildCommitCommand(options));
}
