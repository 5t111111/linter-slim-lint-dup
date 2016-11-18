'use babel'

import { CompositeDisposable } from 'atom'

import * as helpers from 'atom-linter'
import escapeHtml from 'escape-html'
import { dirname } from 'path'

const regex = /.+?:(\d+) \[(W|E)\] (\w+): (.+)/g
const urlBase = 'https://github.com/sds/slim-lint/blob/master/lib/slim_lint/linter/README.md'

export default {

  executablePath: null,
  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(
      atom.config.observe('linter-slim-lint.executablePath', (value) => {
        executablePath = value
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose()
  },

  provideLinter() {
    return {
      name: 'Slim-Lint',
      grammarScopes: ['text.slim'],
      scope: 'file',
      lintOnFly: false,

      lint: async (textEditor) => {
        const filePath = textEditor.getPath()
        const text = textEditor.getText()

        const parameters = []

        const options = {
          cwd: dirname(filePath),
          ignoreExitCode: true,
        }

        parameters.push(filePath)

        const output = await helpers.exec(executablePath, parameters, options)

        if (textEditor.getText() !== text) {
          console.warn(
            'linter-slim-lint:: The file was modified since the ' +
            'request was sent to check it. Since any results would no longer ' +
            'be valid, they are not being updated. Please save the file ' +
            'again to update the results.'
          )
          return null
        }

        const messages = []

        let match = regex.exec(output)

        while (match !== null) {
          const type = match[2] === 'W' ? 'Warning' : 'Error'
          const line = Number.parseInt(match[1], 10) - 1
          const ruleName = escapeHtml(match[3])
          const message = escapeHtml(match[4])
          messages.push({
            type,
            filePath,
            range: helpers.rangeFromLineNumber(textEditor, line),
            html: `<a href="${urlBase}#${ruleName.toLowerCase()}">${ruleName}</a>: ${message}`,
          })

          match = regex.exec(output)
        }
        return messages
      }
    }
  }
}
