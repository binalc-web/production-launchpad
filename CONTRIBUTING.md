# Contributing to MedicalEase

First things first, welcome to the team 🙌🎉

The guidelines that we've layed out here will help you start contributing the project. Our project is a monorepo currently hosted on [Github.com](https://github.com/). An important thing to note is that these are guidelines and not rules. We have to treat this as a living document, feel free to propose changes to this document via a PR.

#### Table of Contents

- [Do I have to read the whole thing?](#do-i-have-to-read-the-whole-thing)
- [Local Setup](#local-setup)
- [CI/CD](#cicd)
- [Styleguides](#styleguides)
  - [Git commit messages](#git-commit-messages)
  - [PRs](#prs)
- [Infrastructure](#infrastructure)
- [Database](#database)
- [Frontend](#frontend)
- [Backend](#backend)
- [Ingestion](#ingestion)
- [Additional Resources](#additional-resources)

## Do I have to read the whole thing?

Well, _not really_. You don't need the entire thing but we strongly encourage you to read the first three sections. This will help you with -- getting the project setup on your local machine including all the dependencies whether on your OS or internal to the project and general style guides that we follow in the project.

You can use the rest of the guideline as a reference when you're working on specific areas in the project to understand how we handle things there.

## Local Setup

We have outlined how to get the project started locally in the [README](./README.md). Please follow the instructions there.

If you see something that doesn't work for you, please reach out the team. If you're able to fix a problem that you were facing or if you notice something that can be improved in the README, feel free to open a PR.

## CI/CD

We use Github Actions to run our CI/CD pipelines. You'll find all the automation workflows in `.github` folder in the root of the project. Here is a brief overview of the CI/CD setup in place:

- **Preview Environments**: when you open a PR, we will create a preview environment which runs the code that was pushed in that particular PR. This can be infrastructure, backend, frontend, database migrations or ingestion. You will be able to test/QA your code in isolation. The environment is also destroyed when the PR is closed or merged. A link to the FE that is running the frontend code will be available as a comment in the PR. Please share this link with the product team to get their feedback on feature. This link can also be used for testing.

  > [!NOTE]
  >
  > The full FE/BE synced preview environments are not available as of writing this guide. The current preview environment points to the development environment API.

> [!NOTE]
>
> We'll be transitioning to a tag-based release for production down the line. This means

## Styleguides

#### Git commit messages

- Use present tense ("Add LLM feature x" not "Added LLM feature x")
- Use the imperative mood ("Move component to.." not "Moves component to...")
- Try to limit the first line to 72 chars or less
- Start commit messages with a respective tag:
  - `feat` for a feature
  - `fix` for a fix
  - `docs` for a documentation change
  - `ci` for a CI/CD change
- Use a scope after the tag to distinguish between different parts of our system that the commit if affecting:
  - `web` for frontend
  - `api` for backend
  - `ingestion` for ingestion
  - `infra` for infrastructure
  - `db` for database migrations
- Here are some example of commit messages
  - `fix(web): Update env var for API Gateway`
  - `feat(infra): Add WebSocketStack`
  - `feat(db): Add session_id to users table`

> [!NOTE]
>
> We have introduced commit linting in the repository. This would mean your commit message has to be formatted correctly or you'll not be able to commit. Correct Format needs to follow the above Git commit message guidelines.

> We can also use commitzen to create properly formatted commits, by using the below commands:

- `git add .`
- `npx git-cz`
- `git push`

#### PRs

We are very opinionated about PRs. Here are the things that you should keep in mind when opening PRs:

- Keep the PRs as small as possible. This reduces the cognitive load on the reviewers and this in turn leads to speeding up the review process which means that the PRs are merged in faster.
- You don't need to map one ticket to one PR. Ideally, we should have done a good job of breaking down the ticket in the first place so that you don't need multiple PRs for a single ticket. In case, the scope of the ticket is still too big for a single PR then it can be broken down in multiple different PRs.
- PR titles:
  - PR titles are what will become commits on the `develop` and `main` branch.
  - Follow the guidelines for the commit messages. We will use the tag but the scope would be the ticket.
  - E.g. feat(ME-193): Update LLM call setup for conversation API
- When only updating documentation add `[no ci]` to the PR title, this will make sure that we don't run any CI jobs
- Make sure that you squash the commits before merging. The title of the merge commit should be the title of the PR and the description should contain a list of all the commits that are being squashed. **This is the default behavior when merging PRs in Medical**

> [!WARNING]
>
> `[no ci]` should only be used when updating documentation.

> [!NOTE]
>
> We might introduce hooks on Github side to not allow a PR to be merged if the title is malformed

## Frontend

The frontend is available in `frontend` folder. The instructions to get started with development are available in [README](./README.md). We use `vite` to bundle our FE code. There are other libraries which we use to deliver the app but they're described more in detail in the Frontend README.

Here are a couple of important things to keep in mind about our FE setup:

- We write our FE components in Typescript
- We use `prettier` to format our code
- Our code is linted with `eslint`
- There is a pre-commit hook which will run `prettier` and `eslint` on the staged files and not allow you to push a commit until its fixed
- We plan to also add typechecking to the mix down the road
