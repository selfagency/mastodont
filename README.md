# Mastodont

Mastodont is a CLI tool to import blocklists into Mastodon written in Node.js.

It uses the `/admin/domain_blocks` [endpoint](https://docs.joinmastodon.org/methods/admin/domain_blocks/#create) newly
available in Mastodon v4 and therefore requires instances run on v4+.

![mastodont](https://user-images.githubusercontent.com/2541728/203543918-469deec7-6c54-4dd2-b13b-06e5ab5350ce.png)

## Installation

Go to `https://${YOUR_INSTANCE_URL}/settings/applications/new` and create a new application called `Mastodont` with the
permissions:

- `admin:read:domain_allows`
- `admin:write:domain_allows`

Save the application, click on it, and copy the value of `Your access token` to the clipboard.

Open a terminal and run:

```bash
> npm install -g mastodont
```

## Usage

```bash
> mastodont
```

Mastodont operates interactively and requires only a Mastodon instance URL, an access token with the necessary
permissions, and a text file containing a list of domains to block, one per line. A sample blocklist is provided in the
`examples` folder at the root of this repository. The file can be hosted locally or remotely.

Mastodont will prompt you for your instance URL, access token, and the location of the blocklist file. It will
optionally save
the former two options, along with your preferences for domain blocks, to a `.mastodont.yml` file in your home folder so
that you don't need to enter them repeatedly.

If you want to skip the prompts, you can pass the values as arguments using the following flags:

### Mastodont config

- `--help`: Show help
- `-c $PATH, --config $PATH`: Optional custom config file path
- `--non-interactive`: Disable interactive mode
- `--save`: Save config to default location
- `--reset`: Delete config (cannot be used with other options)

### Instance config

- `-e $URL, --endpoint $URL`: Mastodon server URL
- `-t $TOKEN, --access-token $TOKEN`: Mastodon Access Token
- `-b $LOCATION, --blocklist $LOCATION`: Blocklist filepath or URL

### Block config

- `-s $LEVEL, --severity $LEVEL`: Block severity level (`silence`, `suspend`, `noop`)
- `--obfuscate`: Obfuscate domains in public listing
- `--reject-media`: Reject media from domains (works with `limit`, `noop`)
- `--reject-reports`: Reject reports from domains (works with `limit`,`noop`)
- `--private-comment $COMMENT`: Private comment
- `--public-comment $COMMENT`: Public comment

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
