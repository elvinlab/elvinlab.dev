# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Do not open a public issue.

Include what you found, how to reproduce it and the impact you expect. You will get a reply within a few days.

## Scope

- The site at elvinlab.dev and its contact endpoint.
- The code in this repository, including `@elvinlab/core`.

## Secrets

This repository never stores secrets. Runtime secrets live in Cloudflare; local values go in git-ignored `.dev.vars` files.
