# UI-Plugins-Client

A JavaScript library to build user plugins for BriteCore UI.


## Contacts

### Maintainers

- Grant McConnaughey
- Valdir Stumm Junior


### Communication

**Slack channel:** [#pd-ui-plugins-int](https://britecore.slack.com/messages/CJ2P5KJ22/)


## Getting Started

### Setting up a Dev Environment

1. On GitHub, fork this repo by clicking the Fork button in the GitHub UI.

2. Clone your fork of the repo on your local machine and go into the directory:

```
$ git clone git@github.com:{username}/UI-Plugins-Client.git
$ cd UI-Plugins-Client
```

3. Add any git remotes:

```
$ git iws init

$ git fetch upstream

$ git branch -u upstream/master
```

4. Install all the dependencies:

```
$ yarn install
```

4. Spin up the development server:

```
$ yarn run serve
```

5. Alternatively, you can run this command to build the project and serve it in another way:

```
$ yarn run build
```

Now you can make changes to the [library source file](./src/index.js) and then a bundle version of it will be generated in `dist/britecore-ui-plugins.js`.
