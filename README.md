# Mastodont

Mastodont is a CLI tool to import blocklists into Mastodon written in Node.js.

It uses the `/admin/domain_blocks` [endpoint](https://docs.joinmastodon.org/methods/admin/domain_blocks/#create)
and requires Mastodon instances running v4 or higher.

![mastodont](https://user-images.githubusercontent.com/2541728/203543918-469deec7-6c54-4dd2-b13b-06e5ab5350ce.png)

## New in v2

- Support for plain text, JSON, and CSV blocklists. If you pass a `.json` file it should contain an array of domains. If you pass a CSV file Mastodont will attempt to use a `domain` column (or the first column if none is present).
- An `--allowlist` mode: supply an allowlist (filepath or URL) to remove matching domain blocks from the instance instead of adding them.
- `--update` mode: when enabled, existing domain blocks that are already present on the instance will be patched/updated to match the options you supply (severity, comments, obfuscation, etc.).
- The `severity` values have changed to `silence`, `suspend`, and `noop` (note: README and help reflect these exact values).

## Configuration

Go to `https://${YOUR_INSTANCE_URL}/settings/applications/new` and create a new application called `Mastodont` with the
permissions:

- `admin:read:domain_allows`
- `admin:write:domain_allows`

Save the application, click on it, and copy the value of `Your access token` to the clipboard.

Open a terminal and run:

## Usage

You can install it if you want, in the traditional manner. Or you can just run it with `npx`:

```bash
> npx mastodont
```

Mastodont operates interactively and requires only a Mastodon instance URL, an access token with the necessary

Permissions, a blocklist file, and an access token with the necessary permissions are required. The file can be hosted locally or remotely.
A sample blocklist is provided in the `examples` folder at the root of this repository. You can also try [mastodon-defederate](https://github.com/Anthchirp/mastodon-defederate), which will download blocklists from servers you trust.

Mastodont will prompt you for your instance URL, access token, and the location of the blocklist file. It will
optionally save the former two options, along with your preferences for domain blocks, to a `.mastodont.yml` file in your home
folder so that you don't need to enter them repeatedly. The default config path is `~/.mastodont.yml`.

If you want to skip the prompts, you can pass the values as arguments using the following flags:

### Mastodont config

- `--help`: Show help
- `-c $PATH, --config $PATH`: Optional custom config file path
- `--non-interactive`: Disable interactive mode
- `--save`: Save config to default location
- `--reset`: Delete config (cannot be used with other options)
- `--update`: Update existing blocks on the instance that match the incoming list (patches their settings)

### Instance config

- `-e $URL, --endpoint $URL`: Mastodon server URL
- `-t $TOKEN, --access-token $TOKEN`: Mastodon Access Token
- `-b $LOCATION, --blocklist $LOCATION`: Blocklist filepath or URL
- `-a $LOCATION, --allowlist $LOCATION`: Allowlist filepath or URL — when provided and no `--blocklist` is set, Mastodont will remove matching blocks instead of adding them

### Block config

- `-s $LEVEL, --severity $LEVEL`: Block severity level (`limit`, `suspend`, `noop`)
- `--obfuscate`: Obfuscate domains in public listing
- `--reject-media`: Reject media from domains (works with `limit`, `noop`)
- `--reject-reports`: Reject reports from domains (works with `limit`,`noop`)
- `--private-comment $COMMENT`: Private comment
- `--public-comment $COMMENT`: Public comment
- `-s $LEVEL, --severity $LEVEL`: Block severity level (`silence`, `suspend`, `noop`). Default: `silence`.
- `--obfuscate`: Obfuscate domains in the public comment/field (useful when you don't want raw domains visible in public comments)
- `--reject-media`: Reject media from domains (applies when severity is not `suspend`)
- `--reject-reports`: Reject reports from domains (applies when severity is not `suspend`)
- `--private-comment $COMMENT`: Private comment. Mastodont prefixes private comments with `[import-mastodont]` to mark imports.
- `--public-comment $COMMENT`: Public comment
- `--update`: When present, existing domain blocks will be patched instead of only adding new ones

### Automation

Mastodont can be used to automatically update your blocklist on a regular basis. To do so, you can use a cron job or a
CI workflow. Examples of a cron job and CI workflows are provided in the `examples` folder at the root of this
repository.

### Debugging

Something not working as expected? You can see more detailed debugging output if you add `DEBUG=*` before the command.
For example:

```bash
> DEBUG=* mastodont
```

## License

MIT

## Author

[@selfagency](https://kibitz.cloud/@selfagency)
