# Open webapp bot

- volta
- nodejs
- telegraf framework
- serverless framework
- serverless-http
- yandex-cloud-serverless-plugin

## Setup

- install [volta](https://docs.volta.sh/guide/getting-started)

- install [yc cli](https://yandex.cloud/ru/docs/cli/quickstart)

```sh
git clone https://github.com/nezort11/telegraf-serverless-yandex-cloud-template.git your-project-name
cd ./your-project-name
rm -rf .git

volta install node@18
pnpm install

# Start development server
pnpm dev
```

## Deploy

```sh
pnpm bot:deploy

# or

pnpm build
pnpm serverless:deploy
pnpm serverless:info
pnpm webhook:set
```

Clear resource and reset

```sh
pnpm bot:purge

# or
pnpm serverless:purge
pnpm webhook:delete
```
