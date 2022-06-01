import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

type Format = 'space-delimited' | 'csv' | 'json'

async function run(): Promise<void> {
  try {
    // Create GitHub client with the API token.
    const client = new GitHub(core.getInput('token', {required: true}))
    const format = core.getInput('format', {required: true}) as Format
    const packageFoldersRaw = core.getInput('packageFolders', {required: true})
    let packageFolders: string[] = []
    if (packageFoldersRaw && packageFoldersRaw.length) {
      packageFolders = JSON.parse(packageFoldersRaw) as string[]
    }

    if (packageFolders.length < 1) {
      core.setFailed('Package folders is required')
    }

    // Ensure that the format parameter is set properly.
    if (format !== 'space-delimited' && format !== 'csv' && format !== 'json') {
      core.setFailed(`Format must be one of 'string-delimited', 'csv', or 'json', got '${format}'.`)
    }

    // Debug log the payload.
    core.debug(`Payload keys: ${Object.keys(context.payload)}`)

    // Get event name.
    const eventName = context.eventName

    // Define the base and head commits to be extracted from the payload.
    let base: string | undefined
    let head: string | undefined

    switch (eventName) {
      case 'pull_request':
        base = context.payload.pull_request?.base?.sha
        head = context.payload.pull_request?.head?.sha
        break
      case 'push':
        base = context.payload.before
        head = context.payload.after
        break
      default:
        core.setFailed(
          `This action only supports pull requests and pushes, ${context.eventName} events are not supported. ` +
            "Please submit an issue on this action's GitHub repo if you believe this in correct."
        )
    }

    // Log the base and head commits
    core.info(`Base commit: ${base}`)
    core.info(`Head commit: ${head}`)

    // Ensure that the base and head properties are set on the payload.
    if (!base || !head) {
      core.setFailed(
        `The base and head commits are missing from the payload for this ${context.eventName} event. ` +
          "Please submit an issue on this action's GitHub repo."
      )

      // To satisfy TypeScript, even though this is unreachable.
      base = ''
      head = ''
    }

    // Use GitHub's compare two commits API.
    // https://developer.github.com/v3/repos/commits/#compare-two-commits
    const response = await client.repos.compareCommits({
      base,
      head,
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    // Ensure that the request was successful.
    if (response.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200. ` +
          "Please submit an issue on this action's GitHub repo."
      )
    }

    // Ensure that the head commit is ahead of the base commit.
    if (response.data.status !== 'ahead') {
      core.setFailed(
        `The head commit for this ${context.eventName} event is not ahead of the base commit. ` +
          "Please submit an issue on this action's GitHub repo."
      )
    }

    // Get the changed files from the response payload.
    const files = response.data.files
    const changedPackages = [] as string[]
    for (const file of files) {
      const filename = file.filename

      if (file.status === 'removed') {
        continue
      }

      // If we're using the 'space-delimited' format and any of the filenames have a space in them,
      // then fail the step.
      if (format === 'space-delimited' && filename.includes(' ')) {
        core.setFailed(
          `One of your files includes a space. Consider using a different output format or removing spaces from your filenames. ` +
            "Please submit an issue on this action's GitHub repo."
        )
      }

      const filenameParts = filename.split('/')
      if (!packageFolders.includes(filenameParts[0])) {
        continue
      }

      const packagePath = filenameParts.slice(0, 2).join('/')
      if (changedPackages.includes(packagePath)) {
        continue
      }

      changedPackages.push(packagePath)
    }

    // Format the arrays of changed files.
    let formatted: string
    switch (format) {
      case 'space-delimited':
        // If any of the filenames have a space in them, then fail the step.
        for (const path of changedPackages) {
          if (path.includes(' '))
            core.setFailed(
              `One of your files includes a space. Consider using a different output format or removing spaces from your filenames.`
            )
        }
        formatted = changedPackages.join(' ')
        break
      case 'csv':
        formatted = changedPackages.join(',')
        break
      case 'json':
        formatted = JSON.stringify(changedPackages)
        break
    }

    // Log the output values.
    core.info(`Folders: ${formatted}`)

    // Set step output context.
    core.setOutput('folders', formatted)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
