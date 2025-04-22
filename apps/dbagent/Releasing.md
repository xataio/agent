# Releasing

## Create a new tag

```bash
git tag -a v0.1.9 -m "Release 0.1.9"
git push origin v0.1.9
```

## Create docker image

In the root directory, run something like:

```bash
docker build --platform linux/amd64  -t xataio/agent:0.1.9 .
```

Login to docker hub (credentials in 1Password) and push the image.

```bash
docker push xataio/agent:0.1.9
```

Update the tag in the `docker-compose.yml` file.

## Release notes

Get the list of changes from the git log since the last tag.

```bash
git log v0.1.2.. | pbcopy
```

And summarize it into release notes using AI.
