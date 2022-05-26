<p align="center">
  <a href="https://github.com/miserenkov/get-changed-packages/actions"><img alt="miserenkov/get-changed-packages status" src="https://github.com/miserenkov/get-changed-packages/workflows/Test/badge.svg"></a>
</p>

# Usage

See [action.yml](action.yml)

```yaml
- uses: miserenkov/get-changed-packages@v1
  with:
    # Format of the steps output context.
    # Can be 'space-delimited', 'csv', or 'json'.
    # Default: 'json'
    format: ''
    # Folders with packages. 
    packageFolder: '['modules']'
```

## Get all changed packages

```yaml
- id: files
  uses: miserenkov/get-changed-packages@v1
  with:
    format: 'json'
    packageFolders: '["libraries", "modules"]'
- run: |
    for packageFolder in ${{ steps.files.outputs.folders }}; do
      echo "Do something with this ${packageFolder}."
    done
```

# Install, Build, Lint, Test, and Package

Make sure to do the following before checking in any code changes.

```bash
$ yarn
$ yarn all
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
