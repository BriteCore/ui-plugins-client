# UI-Plugins-Client

A JavaScript library to build user plugins for BriteCore UI.

## Communication

**Slack channel:** [#pd-ui-plugins-int](https://britecore.slack.com/messages/CJ2P5KJ22/)

## Getting Started

### Usage

1. Create `.npmrc` file in the root directory of your plugin project and fill with:

    ```bash
    @intuitivewebsolutions:registry=https://npm.pkg.github.com/
    //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
    ```

2. Generate a GitHub token with packages read permission and export it as `GITHUB_TOKEN`

    ```bash
    export GITHUB_TOKEN=<YOUR_GENERATED_TOKEN>
    npm install @intuitivewebsolutions/ui-plugins-client
    ```

### Setting up a Dev Environment

1. Install all the dependencies:

    ```bash
    yarn install
    # or npm install
    ```

2. Spin up the development server:

    ```bash
    yarn serve
    # or npm run serve
    ```

3. Alternatively, you can run this command to build the project and serve it in another way:

    ```bash
    yarn build
    ```
