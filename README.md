# UI-Plugins-Client

A JavaScript library to build user plugins for BriteCore UI

## Communication

Please see our [contributing guidelines](.github/CONTRIBUTING.md)

## Getting Started

### [Installing](https://docs.github.com/en/free-pro-team@latest/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages#installing-a-package)

1. Create `.npmrc` file in the root directory of your plugin project and fill with:

    ```bash
    @intuitivewebsolutions:registry=https://npm.pkg.github.com/
    ```

2. Install by running:

    ```
    npm install @intuitivewebsolutions/ui-plugins-client
    ```

### Testing

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
